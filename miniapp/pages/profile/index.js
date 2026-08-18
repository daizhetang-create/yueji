const { fundCommitment } = require('../../services/payment')

Page({
  data: { paying: false },

  async bindPayment() {
    if (this.data.paying) return
    this.setData({ paying: true })
    try {
      await fundCommitment('starter-seven-days')
      wx.showToast({ title: '承诺金已支付', icon: 'success' })
    } catch (error) {
      if (error && String(error.errMsg || error.message).includes('cancel')) return
      wx.showModal({ title: '暂时无法支付', content: error.message || '请检查商户参数和服务器域名', showCancel: false })
    } finally {
      this.setData({ paying: false })
    }
  },

  showSync() {
    wx.showModal({ title: '自动同步', content: '小程序先使用一键确认。iOS / Android App 将分别读取 Apple 健康与 Health Connect。', showCancel: false })
  },
})
