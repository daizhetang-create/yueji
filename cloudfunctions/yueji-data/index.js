const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const VALID_TASKS = new Set(['meditation', 'workout', 'sleep'])

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function checkInId(openid, date, taskType) {
  return `${openid}_${date}_${taskType}`
}

async function ensureUser(openid) {
  await db.collection('users').doc(openid).set({
    data: {
      openid,
      status: 'active',
      updatedAt: db.serverDate(),
      lastSeenAt: db.serverDate(),
    },
  })
}

async function bootstrap(openid) {
  await ensureUser(openid)
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 14)
  const cutoffKey = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}-${String(cutoff.getDate()).padStart(2, '0')}`

  const [plans, checkins] = await Promise.all([
    db.collection('plans').where({ openid, state: 'active' }).orderBy('createdAt', 'desc').limit(1).get(),
    db.collection('checkins').where({ openid, date: db.command.gte(cutoffKey) }).orderBy('date', 'asc').limit(100).get(),
  ])

  return { ok: true, plan: plans.data[0] || null, checkins: checkins.data }
}

async function checkIn(openid, event) {
  assert(VALID_TASKS.has(event.taskType), '不支持的打卡类型')
  assert(/^\d{4}-\d{2}-\d{2}$/.test(event.date || ''), '日期格式不正确')
  assert(typeof event.done === 'boolean', '打卡状态不正确')

  const record = {
    openid,
    planId: event.planId || '',
    taskType: event.taskType,
    date: event.date,
    done: event.done,
    source: 'self_confirmed',
    updatedAt: db.serverDate(),
  }
  await db.collection('checkins').doc(checkInId(openid, event.date, event.taskType)).set({ data: record })
  return { ok: true, checkin: { ...record, updatedAt: new Date().toISOString() } }
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  assert(OPENID, '未获得微信用户身份')

  if (event.action === 'bootstrap') return bootstrap(OPENID)
  if (event.action === 'checkIn') return checkIn(OPENID, event)
  throw new Error('不支持的操作')
}
