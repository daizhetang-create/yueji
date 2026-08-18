import { createServer } from 'node:http'
import { randomBytes } from 'node:crypto'
import { getCommitment, getOrder, markOrderPaid, rememberOrder } from './commitments.mjs'
import { createDepositPayment, refundDeposit, verifyAndDecryptNotification } from './wechatpay.mjs'

const port = Number(process.env.PORT || 8787)

function json(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  response.end(JSON.stringify(body))
}

async function readBody(request) {
  const chunks = []
  for await (const chunk of request) chunks.push(chunk)
  return Buffer.concat(chunks).toString('utf8')
}

function setCors(request, response) {
  const allowed = process.env.ALLOWED_ORIGIN
  if (allowed && request.headers.origin === allowed) response.setHeader('Access-Control-Allow-Origin', allowed)
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
}

async function exchangeLoginCode(code) {
  if (!process.env.WECHAT_APP_ID || !process.env.WECHAT_APP_SECRET) throw new Error('微信小程序登录配置不完整')
  const params = new URLSearchParams({
    appid: process.env.WECHAT_APP_ID,
    secret: process.env.WECHAT_APP_SECRET,
    js_code: code,
    grant_type: 'authorization_code',
  })
  const response = await fetch(`https://api.weixin.qq.com/sns/jscode2session?${params}`)
  const result = await response.json()
  if (!response.ok || result.errcode || !result.openid) throw new Error(result.errmsg || '微信登录失败')
  return result
}

const server = createServer(async (request, response) => {
  setCors(request, response)
  if (request.method === 'OPTIONS') return response.writeHead(204).end()

  try {
    if (request.method === 'GET' && request.url === '/health') {
      return json(response, 200, {
        ok: true,
        wechatConfigured: Boolean(process.env.WECHAT_APP_ID && process.env.WECHAT_MCH_ID && process.env.WECHAT_MCH_PRIVATE_KEY),
      })
    }

    if (request.method === 'POST' && request.url === '/api/wechat/login') {
      const body = JSON.parse(await readBody(request))
      if (!body.code) return json(response, 400, { error: 'code 必填' })
      const session = await exchangeLoginCode(body.code)
      return json(response, 200, { openid: session.openid })
    }

    if (request.method === 'POST' && request.url === '/api/wechat/pay/deposit') {
      const body = JSON.parse(await readBody(request))
      const commitment = getCommitment(body.commitmentId)
      if (!commitment || !body.openid) return json(response, 400, { error: '无效的约定或用户' })
      const outTradeNo = `YJ${Date.now()}${randomBytes(4).toString('hex')}`.slice(0, 32)
      const payment = await createDepositPayment({ openid: body.openid, commitment, outTradeNo })
      rememberOrder({
        outTradeNo,
        commitmentId: commitment.id,
        openid: body.openid,
        totalFen: commitment.depositFen,
        state: 'NOTPAY',
        createdAt: new Date().toISOString(),
      })
      return json(response, 200, payment)
    }

    if (request.method === 'POST' && request.url === '/api/wechat/pay/notify') {
      const rawBody = await readBody(request)
      const transaction = verifyAndDecryptNotification(rawBody, request.headers)
      if (transaction.trade_state === 'SUCCESS') markOrderPaid(transaction.out_trade_no, transaction)
      return json(response, 200, { code: 'SUCCESS', message: '成功' })
    }

    if (request.method === 'POST' && request.url === '/internal/wechat/refund') {
      const token = request.headers.authorization?.replace(/^Bearer\s+/i, '')
      if (!process.env.INTERNAL_CRON_SECRET || token !== process.env.INTERNAL_CRON_SECRET) return json(response, 401, { error: '未授权' })
      const body = JSON.parse(await readBody(request))
      const order = getOrder(body.outTradeNo)
      if (!order || order.state !== 'PAID') return json(response, 404, { error: '已支付订单不存在' })
      const result = await refundDeposit({ order, refundFen: body.refundFen })
      return json(response, 200, result)
    }

    return json(response, 404, { error: 'Not found' })
  } catch (error) {
    console.error(error)
    return json(response, 500, { error: error.message || '服务器错误' })
  }
})

server.listen(port, () => {
  console.log(`Yueji payment server listening on http://localhost:${port}`)
})
