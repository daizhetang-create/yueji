const PRESETS = [
  { type: 'meditation', title: '冥想 10 分钟', detail: '22:30 前', stake: 9.9 },
  { type: 'workout', title: '运动 20 分钟', detail: '21:30 前', stake: 9.9 },
  { type: 'sleep', title: '23:00 前睡觉', detail: '23:00 前', stake: 9.9 },
]

function todayKey() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

Page({
  data: {
    dateText: '',
    tasks: [],
    completed: 0,
    showPresets: false,
    presets: PRESETS,
  },

  onShow() {
    const now = new Date()
    const dateText = `${now.getMonth() + 1}月${now.getDate()}日 · ${['周日', '周一', '周二', '周三', '周四', '周五', '周六'][now.getDay()]}`
    this.refresh(wx.getStorageSync('yueji_tasks') || [], dateText)
  },

  refresh(tasks, dateText = this.data.dateText) {
    const today = todayKey()
    const viewTasks = tasks.map((task) => ({ ...task, done: Boolean(task.history && task.history[today]) }))
    this.setData({ tasks: viewTasks, dateText, completed: viewTasks.filter((task) => task.done).length })
  },

  toggleTask(event) {
    const id = event.currentTarget.dataset.id
    const today = todayKey()
    const tasks = (wx.getStorageSync('yueji_tasks') || []).map((task) => (
      task.id === id
        ? { ...task, history: { ...(task.history || {}), [today]: !(task.history && task.history[today]) } }
        : task
    ))
    wx.setStorageSync('yueji_tasks', tasks)
    this.refresh(tasks)
  },

  openPresets() { this.setData({ showPresets: true }) },
  closePresets() { this.setData({ showPresets: false }) },
  stopPropagation() {},

  addPreset(event) {
    const preset = PRESETS[Number(event.currentTarget.dataset.index)]
    const tasks = wx.getStorageSync('yueji_tasks') || []
    if (tasks.some((task) => task.type === preset.type)) {
      wx.showToast({ title: '已经在今天了', icon: 'none' })
    } else {
      const next = [...tasks, { ...preset, id: `${preset.type}-${Date.now()}`, history: {} }]
      wx.setStorageSync('yueji_tasks', next)
      this.refresh(next)
    }
    this.closePresets()
  },
})
