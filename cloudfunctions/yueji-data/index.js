const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const VALID_TASKS = new Set(['meditation', 'workout', 'read', 'sleep', 'custom'])

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function taskKey(event) {
  const key = event.taskId || event.taskType
  assert(typeof key === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(key), '任务标识不正确')
  return key
}

function recordId(openid, date, event) {
  return `${openid}_${date}_${taskKey(event)}`
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

  const [plans, checkins, reflections] = await Promise.all([
    db.collection('plans').where({ openid, state: 'active' }).orderBy('createdAt', 'desc').limit(1).get(),
    db.collection('checkins').where({ openid, date: db.command.gte(cutoffKey) }).orderBy('date', 'asc').limit(100).get(),
    db.collection('reflections').where({ openid, date: db.command.gte(cutoffKey) }).orderBy('date', 'asc').limit(100).get().catch(() => ({ data: [] })),
  ])

  return { ok: true, plan: plans.data[0] || null, checkins: checkins.data, reflections: reflections.data }
}

async function checkIn(openid, event) {
  assert(VALID_TASKS.has(event.taskType), '不支持的打卡类型')
  assert(/^\d{4}-\d{2}-\d{2}$/.test(event.date || ''), '日期格式不正确')
  assert(typeof event.done === 'boolean', '打卡状态不正确')

  const record = {
    openid,
    planId: event.planId || '',
    taskId: taskKey(event),
    taskType: event.taskType,
    date: event.date,
    done: event.done,
    source: 'self_confirmed',
    updatedAt: db.serverDate(),
  }
  await db.collection('checkins').doc(recordId(openid, event.date, event)).set({ data: record })
  return { ok: true, checkin: { ...record, updatedAt: new Date().toISOString() } }
}

async function saveReflection(openid, event) {
  assert(VALID_TASKS.has(event.taskType), '不支持的任务类型')
  assert(/^\d{4}-\d{2}-\d{2}$/.test(event.date || ''), '日期格式不正确')
  assert(Number.isInteger(event.rating) && event.rating >= 0 && event.rating <= 5, '评分不正确')
  assert(typeof event.text === 'string' && event.text.length <= 180, '随记内容过长')

  const reflection = {
    openid,
    taskId: taskKey(event),
    taskType: event.taskType,
    date: event.date,
    rating: event.rating,
    text: event.text,
    updatedAt: db.serverDate(),
  }
  await db.collection('reflections').doc(recordId(openid, event.date, event)).set({ data: reflection })
  return { ok: true, reflection: { ...reflection, updatedAt: new Date().toISOString() } }
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  assert(OPENID, '未获得微信用户身份')

  if (event.action === 'bootstrap') return bootstrap(OPENID)
  if (event.action === 'checkIn') return checkIn(OPENID, event)
  if (event.action === 'saveReflection') return saveReflection(OPENID, event)
  throw new Error('不支持的操作')
}
