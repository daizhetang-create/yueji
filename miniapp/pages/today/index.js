const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6]
const WEEK_DAYS = [
  { value: 1, label: '一' },
  { value: 2, label: '二' },
  { value: 3, label: '三' },
  { value: 4, label: '四' },
  { value: 5, label: '五' },
  { value: 6, label: '六' },
  { value: 0, label: '日' },
]

const PRESETS = [
  { type: 'meditation', title: '冥想 10 分钟', deadline: '22:30', weekdays: ALL_DAYS, glyph: '～', tone: 'meditation' },
  { type: 'workout', title: '运动 20 分钟', deadline: '21:30', weekdays: [1, 3, 5], glyph: '↗', tone: 'workout' },
  { type: 'read', title: '阅读 20 分钟', deadline: '22:00', weekdays: [1, 2, 3, 4, 5], glyph: '阅', tone: 'read' },
  { type: 'sleep', title: '23:00 前睡觉', deadline: '23:00', weekdays: ALL_DAYS, glyph: '☾', tone: 'sleep' },
]

const { TRACKS, PUBLIC_POOL_DEMO, money, poolPreview } = require('../../config/plans')
const { pullState, syncCheckIn, syncReflection } = require('../../services/data')
const { enableShareMenu, shareToMessage, shareToTimeline } = require('../../services/share')

function todayKey() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function normaliseTask(task, index) {
  const deadline = task.deadline || String(task.detail || '').match(/\d{2}:\d{2}/)?.[0] || '22:00'
  const preset = PRESETS.find((item) => item.type === task.type) || {}
  return {
    ...task,
    id: task.id || `task-${index}-${Date.now()}`,
    type: task.type || 'custom',
    title: task.title || '新的约定',
    deadline,
    detail: `${deadline} 前`,
    weekdays: Array.isArray(task.weekdays) && task.weekdays.length ? task.weekdays : ALL_DAYS,
    mode: task.mode === 'validation' ? 'validation' : 'commitment',
    history: task.history || {},
    notes: task.notes || {},
    glyph: preset.glyph || '·',
    tone: preset.tone || 'custom',
  }
}

function scheduleLabel(weekdays) {
  if (!weekdays || weekdays.length === 7) return '每天'
  if ([1, 2, 3, 4, 5].every((day) => weekdays.includes(day)) && weekdays.length === 5) return '工作日'
  return WEEK_DAYS.filter((day) => weekdays.includes(day.value)).map((day) => `周${day.label}`).join('·')
}

function scheduledToday(task) {
  return !Array.isArray(task.weekdays) || task.weekdays.includes(new Date().getDay())
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
    validationMode: false,
    plan: null,
    pool: {
      ...PUBLIC_POOL_DEMO,
      amount: money(PUBLIC_POOL_DEMO.totalFen),
      rewardEstimate: money(Math.floor(PUBLIC_POOL_DEMO.totalFen / PUBLIC_POOL_DEMO.eligibleCount)),
    },
    showPool: false,
    showNote: false,
    noteTaskId: '',
    noteTaskTitle: '',
    noteRating: 0,
    noteText: '',
    showEditor: false,
    editor: null,
    editorDays: WEEK_DAYS.map((day) => ({ ...day, selected: false })),
    ratings: [1, 2, 3, 4, 5],
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
      const tasks = (wx.getStorageSync('yueji_tasks') || []).map(normaliseTask)
      ;(state.checkins || []).forEach((checkin) => {
        const task = tasks.find((item) => item.id === checkin.taskId) || tasks.find((item) => item.type === checkin.taskType)
        if (task) task.history[checkin.date] = Boolean(checkin.done)
      })
      ;(state.reflections || []).forEach((reflection) => {
        const task = tasks.find((item) => item.id === reflection.taskId) || tasks.find((item) => item.type === reflection.taskType)
        if (task) task.notes[reflection.date] = { rating: reflection.rating || 0, text: reflection.text || '' }
      })
      wx.setStorageSync('yueji_tasks', tasks)
      if (state.plan) wx.setStorageSync('yueji_active_plan', state.plan)
      this.refresh(tasks)
    } catch (error) {
      console.warn('[cloud] 暂未同步，继续使用本机数据', error)
    }
  },

  refresh(rawTasks, dateText = this.data.dateText, greeting = this.data.greeting) {
    const today = todayKey()
    const tasks = rawTasks.map(normaliseTask)
    wx.setStorageSync('yueji_tasks', tasks)
    const viewTasks = tasks.filter(scheduledToday).map((task) => ({
      ...task,
      schedule: scheduleLabel(task.weekdays),
      done: Boolean(task.history && task.history[today]),
      hasNote: Boolean(task.notes && task.notes[today]),
    }))
    const completed = viewTasks.filter((task) => task.done).length
    const storedPlan = wx.getStorageSync('yueji_active_plan') || null
    let plan = null

    if (storedPlan) {
      const track = TRACKS.find((item) => item.id === storedPlan.trackId) || TRACKS[0]
      const trackTask = tasks.find((item) => item.id === storedPlan.taskId) || tasks.find((item) => item.type === storedPlan.trackId)
      const completedDates = trackTask && trackTask.history
        ? Object.keys(trackTask.history).filter((key) => trackTask.history[key] && key >= storedPlan.startDate && key <= storedPlan.endDate)
        : []
      const planCompleted = Math.min(completedDates.length, storedPlan.targetCount || track.targetCount)
      const targetCount = storedPlan.targetCount || track.targetCount
      const preview = poolPreview(storedPlan.amountFen, planCompleted, targetCount)
      plan = {
        ...storedPlan,
        trackTitle: trackTask ? trackTask.title : track.title,
        targetCount,
        completedCount: planCompleted,
        principalRefund: money(preview.principalRefundFen),
        poolContribution: money(preview.poolContributionFen),
        poolRewardEstimate: money(preview.estimatedRewardFen),
        eligible: preview.eligible,
        eligibilityText: preview.eligible ? '已达共享条件' : `再完成 ${Math.max(0, targetCount - planCompleted)} 次`,
        percent: Math.round((planCompleted / targetCount) * 100),
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
    const tasks = (wx.getStorageSync('yueji_tasks') || []).map(normaliseTask).map((task) => (
      task.id === id
        ? { ...task, history: { ...(task.history || {}), [today]: !(task.history && task.history[today]) } }
        : task
    ))
    wx.setStorageSync('yueji_tasks', tasks)
    this.refresh(tasks)
    const changed = tasks.find((task) => task.id === id)
    syncCheckIn({
      taskId: changed ? changed.id : '',
      taskType: changed ? changed.type : '',
      date: today,
      done: Boolean(changed && changed.history && changed.history[today]),
      planId: this.data.plan ? this.data.plan.id : '',
    }).catch((error) => console.warn('[cloud] 打卡稍后同步', error))
  },

  openPresets() { this.setData({ showPresets: true, validationMode: false }) },
  closePresets() { this.setData({ showPresets: false }) },
  toggleValidation() { this.setData({ validationMode: !this.data.validationMode }) },
  openPlan() { wx.navigateTo({ url: '/pages/plan/index' }) },
  stopPropagation() {},

  addPreset(event) {
    const preset = PRESETS[Number(event.currentTarget.dataset.index)]
    const tasks = (wx.getStorageSync('yueji_tasks') || []).map(normaliseTask)
    if (tasks.some((task) => task.type === preset.type && task.title === preset.title)) {
      wx.showToast({ title: '已经在今天了', icon: 'none' })
    } else {
      const next = [...tasks, normaliseTask({ ...preset, id: `${preset.type}-${Date.now()}`, mode: this.data.validationMode ? 'validation' : 'commitment', history: {}, notes: {} }, tasks.length)]
      wx.setStorageSync('yueji_tasks', next)
      this.refresh(next)
    }
    this.closePresets()
  },

  openCustom() {
    this.setData({
      showPresets: false,
      showEditor: true,
      editor: { id: '', type: 'custom', title: '新的约定', deadline: '22:00', weekdays: ALL_DAYS, mode: this.data.validationMode ? 'validation' : 'commitment', history: {}, notes: {} },
      editorDays: WEEK_DAYS.map((day) => ({ ...day, selected: true })),
    })
  },

  openEditor(event) {
    const id = event.currentTarget.dataset.id
    const task = (wx.getStorageSync('yueji_tasks') || []).map(normaliseTask).find((item) => item.id === id)
    if (task) this.setData({ showEditor: true, editor: task, editorDays: WEEK_DAYS.map((day) => ({ ...day, selected: task.weekdays.includes(day.value) })) })
  },

  closeEditor() { this.setData({ showEditor: false, editor: null }) },
  editorTitle(event) { this.setData({ 'editor.title': event.detail.value }) },
  editorDeadline(event) { this.setData({ 'editor.deadline': event.detail.value }) },

  toggleEditorDay(event) {
    const value = Number(event.currentTarget.dataset.value)
    const current = this.data.editor.weekdays || []
    const weekdays = current.includes(value) ? current.filter((day) => day !== value) : [...current, value]
    this.setData({ 'editor.weekdays': weekdays, editorDays: WEEK_DAYS.map((day) => ({ ...day, selected: weekdays.includes(day.value) })) })
  },

  saveEditor() {
    const editor = this.data.editor
    if (!editor.title.trim() || !editor.weekdays.length) {
      wx.showToast({ title: '请填写名称并选择日期', icon: 'none' })
      return
    }
    const tasks = (wx.getStorageSync('yueji_tasks') || []).map(normaliseTask)
    const nextTask = normaliseTask({ ...editor, id: editor.id || `custom-${Date.now()}`, title: editor.title.trim() }, tasks.length)
    const next = tasks.some((task) => task.id === nextTask.id) ? tasks.map((task) => task.id === nextTask.id ? nextTask : task) : [...tasks, nextTask]
    wx.setStorageSync('yueji_tasks', next)
    this.refresh(next)
    this.closeEditor()
    wx.showToast({ title: '已保存', icon: 'success' })
  },

  deleteEditor() {
    const editor = this.data.editor
    if (!editor || !editor.id) return
    wx.showModal({
      title: '删除这项约定？',
      content: '已有本机历史也会一起移除。',
      confirmText: '删除',
      confirmColor: '#b64640',
      success: (result) => {
        if (!result.confirm) return
        const next = (wx.getStorageSync('yueji_tasks') || []).filter((task) => task.id !== editor.id)
        wx.setStorageSync('yueji_tasks', next)
        this.refresh(next)
        this.closeEditor()
      },
    })
  },

  openNote(event) {
    const id = event.currentTarget.dataset.id
    const task = (wx.getStorageSync('yueji_tasks') || []).map(normaliseTask).find((item) => item.id === id)
    if (!task) return
    const note = task.notes[todayKey()] || {}
    this.setData({ showNote: true, noteTaskId: id, noteTaskTitle: task.title, noteRating: note.rating || 0, noteText: note.text || '' })
  },

  closeNote() { this.setData({ showNote: false }) },
  chooseRating(event) {
    const rating = Number(event.currentTarget.dataset.value)
    this.setData({ noteRating: this.data.noteRating === rating ? 0 : rating })
  },
  noteInput(event) { this.setData({ noteText: event.detail.value }) },

  saveNote() {
    const today = todayKey()
    let savedTask = null
    const tasks = (wx.getStorageSync('yueji_tasks') || []).map(normaliseTask).map((task) => {
      if (task.id !== this.data.noteTaskId) return task
      savedTask = task
      return { ...task, notes: { ...task.notes, [today]: { rating: this.data.noteRating, text: this.data.noteText.trim() } } }
    })
    wx.setStorageSync('yueji_tasks', tasks)
    this.refresh(tasks)
    this.closeNote()
    wx.showToast({ title: '随记已保存', icon: 'success' })
    if (savedTask) syncReflection({ taskId: savedTask.id, taskType: savedTask.type, date: today, rating: this.data.noteRating, text: this.data.noteText.trim() }).catch((error) => console.warn('[cloud] 随记稍后同步', error))
  },

  openPool() { this.setData({ showPool: true }) },
  closePool() { this.setData({ showPool: false }) },

  usePause() {
    const storedPlan = wx.getStorageSync('yueji_active_plan')
    if (!storedPlan || storedPlan.pauseUsed) return
    wx.showModal({
      title: '使用本期唯一一次暂缓？',
      content: '目标次数不减少，截止日只顺延一天。',
      confirmText: '使用暂缓',
      success: (result) => {
        if (!result.confirm) return
        const end = new Date(`${storedPlan.endDate}T12:00:00`)
        end.setDate(end.getDate() + 1)
        const endDate = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`
        wx.setStorageSync('yueji_active_plan', { ...storedPlan, pauseUsed: true, pausedDate: todayKey(), endDate })
        this.closePool()
        this.refresh(wx.getStorageSync('yueji_tasks') || [])
        wx.showToast({ title: '已顺延一天', icon: 'success' })
      },
    })
  },
})
