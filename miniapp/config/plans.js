const TRACKS = [
  {
    id: 'meditation',
    name: '冥想',
    title: '冥想 10 分钟',
    schedule: '7 天完成 5 次',
    targetCount: 5,
    deadline: '22:30 前',
    glyph: '～',
    tone: 'meditation',
  },
  {
    id: 'workout',
    name: '运动',
    title: '运动 20 分钟',
    schedule: '7 天完成 3 次',
    targetCount: 3,
    deadline: '21:30 前',
    glyph: '↗',
    tone: 'workout',
  },
  {
    id: 'sleep',
    name: '早睡',
    title: '23:00 前睡觉',
    schedule: '7 天完成 5 次',
    targetCount: 5,
    deadline: '23:00 前',
    glyph: '☾',
    tone: 'sleep',
  },
]

const LEVELS = [
  {
    id: 'light',
    commitmentId: 'seven-day-light',
    name: '轻约',
    amountFen: 990,
    amount: '9.9',
    note: '第一次从这里开始',
    recommended: true,
  },
  {
    id: 'steady',
    commitmentId: 'seven-day-steady',
    name: '认真约',
    amountFen: 1990,
    amount: '19.9',
    note: '已经做过一次计划',
  },
  {
    id: 'strong',
    commitmentId: 'seven-day-strong',
    name: '强约',
    amountFen: 2990,
    amount: '29.9',
    note: '当前封顶，不再加码',
  },
]

function money(fen) {
  return (Math.max(0, fen) / 100).toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1')
}

function earnedRefundFen(amountFen, completed, targetCount) {
  if (!targetCount) return 0
  const safeCompleted = Math.max(0, Math.min(completed, targetCount))
  return Math.floor((amountFen * safeCompleted) / targetCount)
}

module.exports = { TRACKS, LEVELS, money, earnedRefundFen }
