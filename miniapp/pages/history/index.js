function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

Page({
  data: { days: [], tasks: [], completeDays: 0 },
  onShow() {
    const tasks = wx.getStorageSync('yueji_tasks') || []
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date()
      date.setDate(date.getDate() - (6 - index))
      const key = dateKey(date)
      const completed = tasks.filter((task) => task.history && task.history[key]).length
      return { key, weekday: ['日', '一', '二', '三', '四', '五', '六'][date.getDay()], day: date.getDate(), completed, full: tasks.length > 0 && completed === tasks.length }
    })
    const today = dateKey(new Date())
    this.setData({
      days,
      completeDays: days.filter((day) => day.full).length,
      tasks: tasks.map((task) => ({ ...task, done: Boolean(task.history && task.history[today]) })),
    })
  },
})
