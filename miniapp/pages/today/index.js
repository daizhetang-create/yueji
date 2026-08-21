const PRESETS = [
  { type: 'meditation', title: '冥想 10 分钟', detail: '22:30 前', glyph: '～', tone: 'meditation' },
  { type: 'workout', title: '运动 20 分钟', detail: '21:30 前', glyph: '↗', tone: 'workout' },
  { type: 'sleep', title: '23:00 前睡觉', detail: '23:00 前', glyph: '☾', tone: 'sleep' },
]

const { TRACKS, money, earnedRefundFen } = require('../../config/plans')
const { pullState, syncCheckIn } = require('../../services/data')
const { enableShareMenu, shareToMessage, shareToTimeline } = require('../../services/share')

function todayKey() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

Page({
  data: {
    dateText: '',
    greeting: '今天',
    tasks: [],
    completed: 0,
    remaining: 0,
    showPresets: false,
    presets: PRESETS,
    plan: null,
  },

  onLoad() {
    enableShareMenu()
  },

  onShareAppMessage: shareToMessage,
  onShareTimeline: shareToTimeline,

  onShow() {
    const now = new Date()
    const dateText = `${now.getMonth() + 1}月${now.getDate()}日 · ${['周日', '周一', '周二', '周三', '周四', '周五', '周六'][now.getDay()]}`
    const hour = now.getHours()
    const greeting = hour < 11 ? '早上好，今天' : hour < 14 ? '中午好，今天' : hour < 18 ? '下午好，今天' : '晚上好，今天'
    this.refresh(wx.getStorageSync('yueji_tasks') || [], dateText, greeting)
    this.pullCloudState()
  },

  async pullCloudState() {
    try {
      const state = await pullState()
      if (!state) return
      const tasks = wx.getStorageSync('yueji_tasks') || []
      const merged = tasks.map((task) => ({ ...task, history: { ...(task.history || {}) } }))
      ;(state.checkins || []).forEach((checkin) => {
        const task = merged.find((item) => item.type === checkin.taskType)
        if (task) task.history[checkin.date] = Boolean(checkin.done)
      })
      wx.setStorageSync('yueji_tasks', merged)
      if (state.plan) wx.setStorageSync('yueji_active_plan', state.plan)
      this.refresh(merged)
    } catch (error) {
      console.warn('[cloud] 暂未同步，继续使用本机数据', error)
    }
  },

  refresh(tasks, dateText = this.data.dateText, greeting = this.data.greeting) {
    const today = todayKey()
    const viewTasks = tasks.map((task) => {
      const preset = PRESETS.find((item) => item.type === task.type) || {}
      return { ...task, glyph: preset.glyph || '·', tone: preset.tone || 'meditation', done: Boolean(task.history && task.history[today]) }
    })
    const completed = viewTasks.filter((task) => task.done).length
    const storedPlan = wx.getStorageSync('yueji_active_plan') || null
    let plan = null

    if (storedPlan) {
      const track = TRACKS.find((item) => item.id === storedPlan.trackId) || TRACKS[0]
      const trackTask = tasks.find((item) => item.type === storedPlan.trackId)
      const completedDates = trackTask && trackTask.history
        ? Object.keys(trackTask.history).filter((key) => trackTask.history[key] && key >= storedPlan.startDate && key <= storedPlan.endDate)
        : []
      const planCompleted = Math.min(completedDates.length, track.targetCount)
      const earnedFen = earnedRefundFen(storedPlan.amountFen, planCompleted, track.targetCount)
      plan = {
        ...storedPlan,
        trackTitle: track.title,
        targetCount: track.targetCount,
        completedCount: planCompleted,
        earned: money(earnedFen),
        remaining: money(storedPlan.amountFen - earnedFen),
        percent: Math.round((planCompleted / track.targetCount) * 100),
      }
    }

    this.setData({
      tasks: viewTasks,
      dateText,
      greeting,
      completed,
      remaining: Math.max(0, viewTasks.length - completed),
      plan,
    })
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
    const changed = tasks.find((task) => task.id === id)
    syncCheckIn({
      taskType: changed ? changed.type : '',
      date: today,
      done: Boolean(changed && changed.history && changed.history[today]),
      planId: this.data.plan ? this.data.plan.id : '',
    }).catch((error) => console.warn('[cloud] 打卡稍后同步', error))
  },

  openPresets() { this.setData({ showPresets: true }) },
  closePresets() { this.setData({ showPresets: false }) },
  openPlan() { wx.navigateTo({ url: '/pages/plan/index' }) },
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
