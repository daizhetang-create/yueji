const config = require('./config')

function enabled() {
  return Boolean(config.envId && config.dataFunctionName && wx.cloud)
}

function callData(action, data = {}) {
  if (!enabled()) return Promise.resolve(null)
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name: config.dataFunctionName,
      config: { env: config.envId },
      data: { action, ...data },
      success: (result) => resolve(result.result),
      fail: reject,
    })
  })
}

async function pullState() {
  const result = await callData('bootstrap')
  return result && result.ok ? result : null
}

async function syncCheckIn({ taskId, taskType, date, done, planId }) {
  const result = await callData('checkIn', { taskId, taskType, date, done, planId: planId || '' })
  return result && result.ok ? result : null
}

async function syncReflection({ taskId, taskType, date, rating, text }) {
  const result = await callData('saveReflection', { taskId, taskType, date, rating, text })
  return result && result.ok ? result : null
}

module.exports = { enabled, pullState, syncCheckIn, syncReflection }
