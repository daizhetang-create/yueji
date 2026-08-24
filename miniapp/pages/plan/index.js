const { TRACKS, LEVELS, PUBLIC_POOL_DEMO, money } = require('../../config/plans')
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
        poolAmount: money(PUBLIC_POOL_DEMO.totalFen),
        poolRewardEstimate: money(Math.floor(PUBLIC_POOL_DEMO.totalFen / PUBLIC_POOL_DEMO.eligibleCount)),
      },
    })
  },

  showRules() {
    wx.showModal({
      title: '承诺金规则',
      content: '承诺金只支付一次。七天结束先按有效完成份额计算个人本金退款；未退份额在未来真实版中拟进入当期共同约池，完整履约且通过复核者等份共享。当前约池仅为机制演示，不发生真实奖励转账。不会再次扣款或自动续期。技术故障与申诉期间冻结结算，仅限成年人参与。',
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
