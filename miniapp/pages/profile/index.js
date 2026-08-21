const config = require('../../services/config')
const { enableShareMenu, shareToMessage, shareToTimeline } = require('../../services/share')

Page({
  data: { cloudReady: false, paymentReady: false, planLabel: '未开始' },

  onLoad() {
    enableShareMenu()
  },

  onShareAppMessage: shareToMessage,
  onShareTimeline: shareToTimeline,

  onShow() {
    const plan = wx.getStorageSync('yueji_active_plan')
    this.setData({
      cloudReady: Boolean(config.envId),
      paymentReady: Boolean(config.envId && config.payFunctionName),
      planLabel: plan ? `${plan.levelName} · 进行中` : '未开始',
    })
  },

  openPlan() {
    wx.navigateTo({ url: '/pages/plan/index' })
  },

  showSync() {
    wx.showModal({ title: '完成判定', content: '第一版使用一键确认，速度最快、阻力最低。后续运动接微信步数或 Health Connect，冥想优先接应用内计时，不上传不必要的隐私数据。', showCancel: false })
  },

  showCloud() {
    wx.showModal({
      title: this.data.cloudReady ? '云同步已连接' : '等待连接 CloudBase',
      content: this.data.cloudReady ? '打卡会同步到云数据库。支付状态最终以微信回调为准。' : '代码已经准备好，开通 CloudBase 环境后只需填写环境 ID 并部署 yueji-data 云函数。',
      showCancel: false,
    })
  },

  clearLocal() {
    wx.showModal({
      title: '清空本机记录？',
      content: '只清除当前设备上的任务与计划缓存，云端记录不会被删除。',
      confirmText: '清空',
      confirmColor: '#c84b4b',
      success: (result) => {
        if (!result.confirm) return
        wx.removeStorageSync('yueji_tasks')
        wx.removeStorageSync('yueji_active_plan')
        wx.showToast({ title: '已清空', icon: 'success' })
        this.onShow()
      },
    })
  },
})
