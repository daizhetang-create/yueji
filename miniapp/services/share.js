const SHARE_TITLE = '约己｜七天，只约一件事'
const SHARE_PATH = '/pages/today/index'

function enableShareMenu() {
  wx.showShareMenu({
    menus: ['shareAppMessage', 'shareTimeline'],
    fail: (error) => console.warn('[share] 分享菜单暂不可用', error),
  })
}

function shareToMessage() {
  return {
    title: SHARE_TITLE,
    path: SHARE_PATH,
  }
}

function shareToTimeline() {
  return {
    title: SHARE_TITLE,
    query: '',
  }
}

module.exports = {
  enableShareMenu,
  shareToMessage,
  shareToTimeline,
}
