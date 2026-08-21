const { TRACKS, LEVELS, money } = require('../../config/plans')
const { fundCommitment } = require('../../services/payment')
const { enableShareMenu, shareToMessage, shareToTimeline } = require('../../services/share')

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

Page({
  data: {
    tracks: TRACKS,
    levels: LEVELS,
    trackId: TRACKS[0].id,
    levelId: LEVELS[0].id,
    summary: {},
    paying: false,
  },

  onLoad() {
    enableShareMenu()
    this.refreshSummary()
  },

  onShareAppMessage: shareToMessage,
  onShareTimeline: shareToTimeline,

  chooseTrack(event) {
    this.setData({ trackId: event.currentTarget.dataset.id }, () => this.refreshSummary())
  },

  chooseLevel(event) {
    this.setData({ levelId: event.currentTarget.dataset.id }, () => this.refreshSummary())
  },

  refreshSummary() {
    const track = TRACKS.find((item) => item.id === this.data.trackId) || TRACKS[0]
    const level = LEVELS.find((item) => item.id === this.data.levelId) || LEVELS[0]
    const singleFen = Math.floor(level.amountFen / track.targetCount)
    this.setData({
      summary: {
        track,
        level,
        single: money(singleFen),
        amount: money(level.amountFen),
      },
    })
  },

  showRules() {
    wx.showModal({
      title: '承诺金规则',
      content: '承诺金只支付一次。七天结束后，按完成份额原路退款；未完成部分不退，不会再次扣款，也不会自动续期。支付后 10 分钟内且尚未打卡，可申请全额取消。技术故障可在结算前复核。仅限成年人参与。',
      showCancel: false,
      confirmText: '我知道了',
    })
  },

  async startPlan() {
    if (this.data.paying) return
    const track = TRACKS.find((item) => item.id === this.data.trackId) || TRACKS[0]
    const level = LEVELS.find((item) => item.id === this.data.levelId) || LEVELS[0]
    this.setData({ paying: true })

    try {
      const payment = await fundCommitment({ commitmentId: level.commitmentId, level, track })
      const start = new Date()
      const end = new Date(start)
      end.setDate(end.getDate() + 6)
      wx.setStorageSync('yueji_active_plan', {
        id: payment.outTradeNo,
        state: 'active',
        levelId: level.id,
        levelName: level.name,
        trackId: track.id,
        amountFen: level.amountFen,
        startDate: dateKey(start),
        endDate: dateKey(end),
        paidAt: new Date().toISOString(),
      })
      wx.showToast({ title: '七日约已开始', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 500)
    } catch (error) {
      const message = String((error && (error.errMsg || error.message)) || '')
      if (message.includes('cancel')) return
      wx.showModal({
        title: '支付环境还没接好',
        content: message || '需要先配置已认证的小程序、CloudBase 环境和微信支付商户号。',
        showCancel: false,
      })
    } finally {
      this.setData({ paying: false })
    }
  },
})
