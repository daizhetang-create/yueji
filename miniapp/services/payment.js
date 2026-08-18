const { apiBase } = require('./config')

function post(path, data) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${apiBase}${path}`,
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

function requestPayment(params) {
  return new Promise((resolve, reject) => wx.requestPayment({ ...params, success: resolve, fail: reject }))
}

async function fundCommitment(commitmentId) {
  const { code } = await login()
  if (!code) throw new Error('未获取到微信登录凭证')
  const { openid } = await post('/api/wechat/login', { code })
  const payment = await post('/api/wechat/pay/deposit', { commitmentId, openid })
  return requestPayment(payment)
}

module.exports = { fundCommitment }
