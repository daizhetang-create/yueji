const STARTER_TASKS = [
  { id: 'meditation', type: 'meditation', title: '冥想 10 分钟', detail: '22:30 前', history: {} },
  { id: 'workout', type: 'workout', title: '运动 20 分钟', detail: '21:30 前', history: {} },
]

const config = require('./services/config')

App({
  globalData: {
    envId: config.envId,
    payFunctionName: config.payFunctionName,
    dataFunctionName: config.dataFunctionName,
  },

  onLaunch() {
    if (!wx.getStorageSync('yueji_tasks')) wx.setStorageSync('yueji_tasks', STARTER_TASKS)
    if (config.envId && wx.cloud) {
      wx.cloud.init({ env: config.envId, traceUser: true })
    }
  },
})
