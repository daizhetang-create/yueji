const config = require('./config')

function requestPayment(params) {
  return new Promise((resolve, reject) => wx.requestPayment({ ...params, success: resolve, fail: reject }))
}

function callPayCommon(action, data) {
  return new Promise((resolve, reject) => {
    wx.cloud.callHTTPFunction({
      name: config.payFunctionName,
      config: { env: config.envId },
      method: 'POST',
      header: { 'Content-Type': 'application/json' },
      path: `/wx-pay/${action}`,
      data,
      success: (result) => resolve(result.data),
      fail: (error) => reject(new Error(error.errMsg || '云支付请求失败')),
    })
  })
}

function uniqueOrderNo() {
  return `YJ${Date.now()}${Math.random().toString(36).slice(2, 8)}`.slice(0, 32)
}

async function fundWithCloudBase({ level, track }) {
  if (!wx.cloud || !wx.cloud.callHTTPFunction) throw new Error('微信基础库需要升级到 3.15.2 或更高版本')

  const outTradeNo = uniqueOrderNo()
  const result = await callPayCommon('wxpay_order', {
    description: `约己七日约 · ${level.name} · ${track.name}`,
    out_trade_no: outTradeNo,
    amount: { total: level.amountFen, currency: 'CNY' },
    attach: JSON.stringify({ levelId: level.id, trackId: track.id }),
  })

  if (!result || result.code !== 0) throw new Error((result && result.msg) || '微信下单失败')
  const payload = result.data && result.data.data ? result.data.data : result.data
  if (!payload) throw new Error('支付参数为空')

  await requestPayment({
    timeStamp: String(payload.timeStamp),
    nonceStr: payload.nonceStr,
    package: payload.package,
    signType: payload.signType || 'RSA',
    paySign: payload.paySign,
  })

  // 前端成功只负责体验反馈；正式订单仍以后端支付回调与查单结果为准。
  return { outTradeNo }
}

function post(path, data) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${config.apiBase}${path}`,
      method: 'POST',
      data,
      success: ({ statusCode, data: result }) => {
        if (statusCode >= 200 && statusCode < 300) resolve(result)
        else reject(new Error(result && result.error ? result.error : `请求失败 (${statusCode})`))
      },
      fail: reject,
    })
  })
}

function login() {
  return new Promise((resolve, reject) => wx.login({ success: resolve, fail: reject }))
}

async function fundWithApi({ commitmentId }) {
  const { code } = await login()
  if (!code) throw new Error('未获取到微信登录凭证')
  const { openid } = await post('/api/wechat/login', { code })
  const payment = await post('/api/wechat/pay/deposit', { commitmentId, openid })
  await requestPayment(payment)
  return { outTradeNo: payment.outTradeNo || uniqueOrderNo() }
}

async function fundCommitment(options) {
  if (config.envId && config.payFunctionName) return fundWithCloudBase(options)
  if (config.apiBase && !config.apiBase.includes('localhost')) return fundWithApi(options)
  throw new Error('还缺 CloudBase 环境 ID 和微信支付集成函数名，代码已经准备好，账号开通后填入即可')
}

module.exports = { fundCommitment, callPayCommon }
