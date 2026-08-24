const { enableShareMenu, shareToMessage, shareToTimeline } = require('../../services/share')

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function scheduledOn(task, date) {
  return !Array.isArray(task.weekdays) || task.weekdays.includes(date.getDay())
}

Page({
  data: { days: [], tasks: [], completeDays: 0, completionRate: 0, todayDone: 0 },

  onLoad() {
    enableShareMenu()
  },

  onShareAppMessage: shareToMessage,
  onShareTimeline: shareToTimeline,

  onShow() {
    const tasks = (wx.getStorageSync('yueji_tasks') || []).map((task) => ({ ...task, weekdays: Array.isArray(task.weekdays) && task.weekdays.length ? task.weekdays : [0, 1, 2, 3, 4, 5, 6], notes: task.notes || {} }))
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date()
      date.setDate(date.getDate() - (6 - index))
      const key = dateKey(date)
      const scheduled = tasks.filter((task) => scheduledOn(task, date))
      const completed = scheduled.filter((task) => task.history && task.history[key]).length
      return { key, weekday: ['日', '一', '二', '三', '四', '五', '六'][date.getDay()], day: date.getDate(), completed, total: scheduled.length, full: scheduled.length > 0 && completed === scheduled.length }
    })
    const today = dateKey(new Date())
    const todayDate = new Date()
    const todayTasks = tasks.filter((task) => scheduledOn(task, todayDate)).map((task) => ({ ...task, done: Boolean(task.history && task.history[today]), hasNote: Boolean(task.notes && task.notes[today]) }))
    const totalChecks = days.reduce((sum, day) => sum + day.completed, 0)
    const possibleChecks = Math.max(1, days.reduce((sum, day) => sum + day.total, 0))
    this.setData({
      days,
      completeDays: days.filter((day) => day.full).length,
      completionRate: Math.round((totalChecks / possibleChecks) * 100),
      todayDone: todayTasks.filter((task) => task.done).length,
      tasks: todayTasks,
    })
  },
})
