const STARTER_TASKS = [
  { id: 'meditation', type: 'meditation', title: '冥想 10 分钟', detail: '22:30 前', stake: 9.9, history: {} },
  { id: 'workout', type: 'workout', title: '运动 20 分钟', detail: '21:30 前', stake: 9.9, history: {} },
]

App({
  onLaunch() {
    if (!wx.getStorageSync('yueji_tasks')) wx.setStorageSync('yueji_tasks', STARTER_TASKS)
  },
})
