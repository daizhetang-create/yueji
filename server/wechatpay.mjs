import { createCipheriv, createDecipheriv, createSign, createVerify, randomBytes } from 'node:crypto'

function normalizePem(value = '') {
  return value.replace(/\\n/g, '\n')
}

export function signPayload(payload, privateKey) {
  const signer = createSign('RSA-SHA256')
  signer.update(payload)
  signer.end()
  return signer.sign(normalizePem(privateKey), 'base64')
}

export function verifyPayload(payload, signature, publicKey) {
  const verifier = createVerify('RSA-SHA256')
  verifier.update(payload)
  verifier.end()
  return verifier.verify(normalizePem(publicKey), signature, 'base64')
}

export function decryptResource(resource, apiV3Key) {
  const encrypted = Buffer.from(resource.ciphertext, 'base64')
  const authTag = encrypted.subarray(encrypted.length - 16)
  const ciphertext = encrypted.subarray(0, encrypted.length - 16)
  const decipher = createDecipheriv('aes-256-gcm', Buffer.from(apiV3Key, 'utf8'), Buffer.from(resource.nonce, 'utf8'))
  decipher.setAuthTag(authTag)
  if (resource.associated_data) decipher.setAAD(Buffer.from(resource.associated_data, 'utf8'))
  return JSON.parse(Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8'))
}

// Only used by the unit test to prove callback decryption is symmetrical.
export function encryptResourceForTest(value, apiV3Key, nonce, associatedData = '') {
  const cipher = createCipheriv('aes-256-gcm', Buffer.from(apiV3Key, 'utf8'), Buffer.from(nonce, 'utf8'))
  if (associatedData) cipher.setAAD(Buffer.from(associatedData, 'utf8'))
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final(), cipher.getAuthTag()])
  return { ciphertext: encrypted.toString('base64'), nonce, associated_data: associatedData }
}

function requiredConfig() {
  const config = {
    appId: process.env.WECHAT_APP_ID,
    mchId: process.env.WECHAT_MCH_ID,
    serialNo: process.env.WECHAT_MCH_SERIAL_NO,
    privateKey: process.env.WECHAT_MCH_PRIVATE_KEY,
    publicKeyId: process.env.WECHATPAY_PUBLIC_KEY_ID,
    publicKey: process.env.WECHATPAY_PUBLIC_KEY,
    apiV3Key: process.env.WECHATPAY_API_V3_KEY,
    notifyUrl: process.env.WECHAT_NOTIFY_URL,
  }
  const missing = Object.entries(config).filter(([, value]) => !value).map(([key]) => key)
  if (missing.length) throw new Error(`微信支付配置不完整：${missing.join(', ')}`)
  return config
}

function nonce() {
  return randomBytes(16).toString('hex')
}

function authorization(method, path, body, config) {
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const nonceStr = nonce()
  const message = `${method}\n${path}\n${timestamp}\n${nonceStr}\n${body}\n`
  const signature = signPayload(message, config.privateKey)
  return `WECHATPAY2-SHA256-RSA2048 mchid="${config.mchId}",nonce_str="${nonceStr}",signature="${signature}",timestamp="${timestamp}",serial_no="${config.serialNo}"`
}

async function requestWechat(method, path, payload) {
  const config = requiredConfig()
  const body = payload ? JSON.stringify(payload) : ''
  const response = await fetch(`https://api.mch.weixin.qq.com${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: authorization(method, path, body, config),
      'Wechatpay-Serial': config.publicKeyId,
    },
    body: body || undefined,
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result.message || `微信支付接口错误 (${response.status})`)
  return result
}

export async function createDepositPayment({ openid, commitment, outTradeNo }) {
  const config = requiredConfig()
  const result = await requestWechat('POST', '/v3/pay/transactions/jsapi', {
    appid: config.appId,
    mchid: config.mchId,
    description: commitment.description,
    out_trade_no: outTradeNo,
    notify_url: config.notifyUrl,
    amount: { total: commitment.depositFen, currency: 'CNY' },
    payer: { openid },
    attach: commitment.id,
  })

  const timeStamp = Math.floor(Date.now() / 1000).toString()
  const nonceStr = nonce()
  const packageValue = `prepay_id=${result.prepay_id}`
  const paySign = signPayload(`${config.appId}\n${timeStamp}\n${nonceStr}\n${packageValue}\n`, config.privateKey)
  return { timeStamp, nonceStr, package: packageValue, signType: 'RSA', paySign }
}

export async function refundDeposit({ order, refundFen }) {
  if (!Number.isInteger(refundFen) || refundFen < 0 || refundFen > order.totalFen) throw new Error('退款金额不合法')
  const outRefundNo = `RF${Date.now()}${randomBytes(4).toString('hex')}`.slice(0, 32)
  return requestWechat('POST', '/v3/refund/domestic/refunds', {
    out_trade_no: order.outTradeNo,
    out_refund_no: outRefundNo,
    reason: '约己承诺周期结算',
    notify_url: process.env.WECHAT_NOTIFY_URL,
    amount: { refund: refundFen, total: order.totalFen, currency: 'CNY' },
  })
}

export function verifyAndDecryptNotification(rawBody, headers) {
  const config = requiredConfig()
  const timestamp = headers['wechatpay-timestamp']
  const nonceStr = headers['wechatpay-nonce']
  const signature = headers['wechatpay-signature']
  const serial = headers['wechatpay-serial']
  if (!timestamp || !nonceStr || !signature) throw new Error('微信支付回调签名头缺失')
  if (serial && serial !== config.publicKeyId) throw new Error('微信支付回调公钥 ID 不匹配')
  const message = `${timestamp}\n${nonceStr}\n${rawBody}\n`
  if (!verifyPayload(message, signature, config.publicKey)) throw new Error('微信支付回调签名无效')
  return decryptResource(JSON.parse(rawBody).resource, config.apiV3Key)
}
