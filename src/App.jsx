import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  BarChart3,
  BookOpen,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  Dumbbell,
  House,
  Moon,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Star,
  Trash2,
  UserRound,
  UsersRound,
  WalletCards,
  X,
} from 'lucide-react'

const STORAGE_KEY = 'yueji-simple-state-v1'
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

const STARTER_TASKS = [
  {
    id: 'meditation',
    type: 'meditation',
    title: '冥想 10 分钟',
    deadline: '22:30',
    weekdays: ALL_DAYS,
    mode: 'commitment',
    history: {},
    notes: {},
  },
  {
    id: 'workout',
    type: 'workout',
    title: '运动 20 分钟',
    deadline: '21:30',
    weekdays: [1, 3, 5],
    mode: 'commitment',
    history: {},
    notes: {},
  },
]

const PRESETS = [
  { type: 'meditation', title: '冥想 10 分钟', deadline: '22:30', weekdays: ALL_DAYS },
  { type: 'workout', title: '运动 20 分钟', deadline: '21:30', weekdays: [1, 3, 5] },
  { type: 'read', title: '阅读 20 分钟', deadline: '22:00', weekdays: [1, 2, 3, 4, 5] },
  { type: 'sleep', title: '23:00 前睡觉', deadline: '23:00', weekdays: ALL_DAYS },
]

const PUBLIC_POOL_DEMO = {
  cycleLabel: '第 01 期',
  totalFen: 3861,
  participantCount: 42,
  eligibleCount: 14,
  state: 'open',
}

const NAV_ITEMS = [
  { id: 'today', label: '今天', icon: House },
  { id: 'history', label: '记录', icon: BarChart3 },
  { id: 'profile', label: '我的', icon: UserRound },
]

function dateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function dateAfter(days, date = new Date()) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return dateKey(next)
}

function money(fen) {
  return (Math.max(0, fen) / 100).toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1')
}

function normaliseTask(task, index) {
  const deadline = task.deadline || (task.detail || '').match(/\d{2}:\d{2}/)?.[0] || '22:00'
  return {
    ...task,
    id: task.id || `task-${index}-${Date.now()}`,
    type: task.type || 'custom',
    title: task.title || '新的约定',
    deadline,
    detail: `${deadline} 前`,
    weekdays: Array.isArray(task.weekdays) && task.weekdays.length ? task.weekdays : ALL_DAYS,
    mode: task.mode === 'validation' ? 'validation' : 'commitment',
    history: task.history && typeof task.history === 'object' ? task.history : {},
    notes: task.notes && typeof task.notes === 'object' ? task.notes : {},
  }
}

function loadState() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY))
    const tasks = Array.isArray(stored?.tasks) ? stored.tasks.map(normaliseTask) : STARTER_TASKS
    return { tasks, plan: stored?.plan || null }
  } catch {
    return { tasks: STARTER_TASKS, plan: null }
  }
}

function greeting() {
  const hour = new Date().getHours()
  if (hour < 6) return '夜深了'
  if (hour < 11) return '早上好'
  if (hour < 14) return '中午好'
  if (hour < 18) return '下午好'
  return '晚上好'
}

function scheduledOn(task, date = new Date()) {
  return !Array.isArray(task.weekdays) || task.weekdays.includes(date.getDay())
}

function scheduleLabel(weekdays = ALL_DAYS) {
  if (weekdays.length === 7) return '每天'
  if ([1, 2, 3, 4, 5].every((day) => weekdays.includes(day)) && weekdays.length === 5) return '工作日'
  return WEEK_DAYS.filter((day) => weekdays.includes(day.value)).map((day) => `周${day.label}`).join('·')
}

function planMetrics(plan, tasks) {
  if (!plan) return null
  const task = tasks.find((item) => item.id === plan.taskId)
  const completedCount = task
    ? Object.entries(task.history || {}).filter(([key, done]) => done && key >= plan.startDate && key <= plan.endDate).length
    : 0
  const creditedCount = Math.min(completedCount, plan.targetCount)
  const principalRefundFen = Math.floor((plan.amountFen * creditedCount) / plan.targetCount)
  return {
    task,
    completedCount: creditedCount,
    remainingCount: Math.max(0, plan.targetCount - creditedCount),
    principalRefundFen,
    poolContributionFen: plan.amountFen - principalRefundFen,
    eligible: creditedCount >= plan.targetCount,
    estimatedRewardFen: Math.floor(PUBLIC_POOL_DEMO.totalFen / Math.max(1, PUBLIC_POOL_DEMO.eligibleCount)),
  }
}

function TaskGlyph({ type, size = 21 }) {
  if (type === 'workout') return <Dumbbell size={size} strokeWidth={2} />
  if (type === 'sleep') return <Moon size={size} strokeWidth={2} />
  if (type === 'read') return <BookOpen size={size} strokeWidth={2} />
  return <Activity size={size} strokeWidth={2} />
}

function AppHeader({ dateText, onProfile }) {
  return (
    <header className="app-header">
      <div>
        <p>{dateText}</p>
        <h1>{greeting()}，今天</h1>
      </div>
      <button className="profile-button" type="button" aria-label="打开我的" onClick={onProfile}>
        <span>约</span>
      </button>
    </header>
  )
}

function ProgressCard({ completed, total }) {
  const progress = total ? Math.round((completed / total) * 100) : 0
  const remaining = Math.max(total - completed, 0)
  const finished = total > 0 && remaining === 0

  return (
    <section className={`progress-card ${finished ? 'is-finished' : ''}`} aria-label={`今日完成 ${completed} 项，共 ${total} 项`}>
      <div className="progress-copy">
        <span>今日进度</span>
        <strong>{finished ? '全部完成' : total ? `还有 ${remaining} 项` : '今天没有安排'}</strong>
        <small>{finished ? '今天可以安心收工了' : '只处理今天，不追赶昨天'}</small>
      </div>
      <div className="progress-ring" style={{ '--progress': `${progress}%` }} aria-hidden="true">
        <div><strong>{completed}</strong><span>/{total}</span></div>
      </div>
    </section>
  )
}

function PoolStatus({ plan, metrics, onOpen }) {
  return (
    <button className="pool-status" type="button" onClick={onOpen}>
      <span className="pool-icon" aria-hidden="true"><UsersRound size={18} /></span>
      <span className="pool-copy">
        <span><strong>共同约池</strong><em>机制演示</em></span>
        <small>
          {plan
            ? `¥${money(PUBLIC_POOL_DEMO.totalFen)} · ${PUBLIC_POOL_DEMO.participantCount} 人同行 · ${metrics?.eligible ? '已达共享条件' : `再完成 ${metrics?.remainingCount ?? 0} 次`}`
            : '未完成份额汇成池，完整履约者共享'}
        </small>
      </span>
      <ChevronRight size={17} aria-hidden="true" />
    </button>
  )
}

function TaskCard({ task, done, note, onToggle, onEdit, onNote }) {
  return (
    <article className={`task-card tone-${task.type} ${done ? 'is-done' : ''}`}>
      <button className="task-toggle" type="button" aria-pressed={done} onClick={onToggle}>
        <span className="task-icon" aria-hidden="true"><TaskGlyph type={task.type} /></span>
        <span className="task-content">
          <strong>{task.title}</strong>
          <span className="task-meta">
            <span><Clock3 size={13} />{task.deadline} 前</span>
            <span>{scheduleLabel(task.weekdays)}</span>
            {task.mode === 'validation' ? <span className="validation-tag">验证</span> : null}
          </span>
        </span>
        <span className="complete-button" aria-hidden="true">
          {done ? <Check size={19} strokeWidth={2.8} /> : null}
        </span>
      </button>
      <div className="task-actions">
        <button type="button" onClick={onEdit}><Pencil size={13} />编辑</button>
        {done ? <button type="button" onClick={onNote}><Star size={13} fill={note ? 'currentColor' : 'none'} />{note ? '已记录' : '记一下'}</button> : null}
      </div>
    </article>
  )
}

function Today({ tasks, plan, metrics, onToggle, onAdd, onEdit, onNote, onPool, onProfile }) {
  const today = dateKey()
  const visibleTasks = tasks.filter((task) => scheduledOn(task))
  const completed = visibleTasks.filter((task) => task.history?.[today]).length
  const now = new Date()
  const dateText = new Intl.DateTimeFormat('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(now).replace('周', ' · 周')

  return (
    <main id="main-content" className="app-page home-page">
      <AppHeader dateText={dateText} onProfile={onProfile} />
      <ProgressCard completed={completed} total={visibleTasks.length} />
      <PoolStatus plan={plan} metrics={metrics} onOpen={onPool} />

      <section className="task-section" aria-labelledby="today-tasks-title">
        <div className="section-heading">
          <h2 id="today-tasks-title">今日约定</h2>
          <span>{visibleTasks.length} 项</span>
        </div>
        {visibleTasks.length ? (
          <div className="task-stack">
            {visibleTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                done={Boolean(task.history?.[today])}
                note={task.notes?.[today]}
                onToggle={() => onToggle(task.id)}
                onEdit={() => onEdit(task)}
                onNote={() => onNote(task)}
              />
            ))}
          </div>
        ) : (
          <button className="empty-day" type="button" onClick={onAdd}>
            <strong>今天留白</strong>
            <span>需要时，再加一件真正想做的事</span>
          </button>
        )}
      </section>

      <button className="floating-add" type="button" aria-label="添加约定" onClick={onAdd}>
        <Plus size={24} strokeWidth={2.4} />
      </button>
    </main>
  )
}

function History({ tasks }) {
  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const date = new Date()
    date.setDate(date.getDate() - (6 - index))
    const key = dateKey(date)
    const scheduledTasks = tasks.filter((task) => scheduledOn(task, date))
    const completed = scheduledTasks.filter((task) => task.history?.[key]).length
    return {
      key,
      weekday: new Intl.DateTimeFormat('zh-CN', { weekday: 'short' }).format(date).replace('周', ''),
      day: date.getDate(),
      completed,
      total: scheduledTasks.length,
      full: scheduledTasks.length > 0 && completed === scheduledTasks.length,
      today: index === 6,
    }
  }), [tasks])

  const completedDays = days.filter((day) => day.full).length
  const completedTasks = days.reduce((sum, day) => sum + day.completed, 0)
  const possible = days.reduce((sum, day) => sum + day.total, 0)
  const rate = possible ? Math.round((completedTasks / possible) * 100) : 0
  const today = new Date()
  const todayTasks = tasks.filter((task) => scheduledOn(task, today))

  return (
    <main id="main-content" className="app-page history-page">
      <header className="simple-header"><p>最近 7 天</p><h1>记录</h1></header>

      <section className="stat-grid" aria-label="最近七天统计">
        <article className="stat-card stat-primary"><span>完成率</span><strong>{rate}<small>%</small></strong><p>{completedTasks} 次完成</p></article>
        <article className="stat-card"><span>完整天数</span><strong>{completedDays}<small>天</small></strong><p>按自己的安排完成</p></article>
      </section>

      <section className="calendar-card" aria-labelledby="week-title">
        <div className="card-heading">
          <div><h2 id="week-title">本周</h2><p>{new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long' }).format(new Date())}</p></div>
          <CalendarDays size={20} aria-hidden="true" />
        </div>
        <div className="week-row">
          {days.map((day) => (
            <div className={`day-pill ${day.full ? 'is-complete' : ''} ${day.today ? 'is-today' : ''}`} key={day.key}>
              <small>{day.weekday}</small><strong>{day.day}</strong><span>{day.completed ? <Check size={11} strokeWidth={3} /> : null}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="record-section" aria-labelledby="record-title">
        <div className="section-heading"><h2 id="record-title">今天</h2><span>{todayTasks.filter((task) => task.history?.[dateKey()]).length}/{todayTasks.length}</span></div>
        <div className="record-card">
          {todayTasks.map((task) => {
            const done = Boolean(task.history?.[dateKey()])
            const note = task.notes?.[dateKey()]
            return (
              <div className="record-item" key={task.id}>
                <span className={`mini-task-icon tone-${task.type}`}><TaskGlyph type={task.type} size={17} /></span>
                <span className="record-copy"><strong>{task.title}</strong><small>{note ? '今天有一条实践随记' : `${task.deadline} 前`}</small></span>
                <span className={`record-state ${done ? 'is-done' : ''}`}>{done ? '已完成' : '待完成'}</span>
              </div>
            )
          })}
        </div>
      </section>
    </main>
  )
}

function SettingRow({ icon: Icon, label, value, onClick, destructive = false }) {
  return (
    <button className={`setting-row ${destructive ? 'is-destructive' : ''}`} type="button" onClick={onClick}>
      <span className="setting-icon"><Icon size={19} strokeWidth={2} aria-hidden="true" /></span>
      <span className="setting-copy">{label}</span>
      {value ? <small>{value}</small> : null}
      <ChevronRight size={17} strokeWidth={2} aria-hidden="true" />
    </button>
  )
}

function Profile({ onInstall, onReset, onPool, notify }) {
  return (
    <main id="main-content" className="app-page profile-page">
      <header className="simple-header"><p>账户与偏好</p><h1>我的</h1></header>

      <section className="identity-card" aria-label="当前账户">
        <span className="app-avatar">约</span>
        <span><strong>约己用户</strong><small>网站数据保存在当前设备</small></span>
        <span className="identity-status">未登录</span>
      </section>

      <section className="settings-group" aria-labelledby="connection-title">
        <h2 id="connection-title">计划</h2>
        <div className="settings-card">
          <SettingRow icon={UsersRound} label="共同约池" value="机制演示" onClick={onPool} />
          <SettingRow icon={WalletCards} label="微信支付" value="小程序接入中" onClick={() => notify('真实支付只会在认证小程序内启用')} />
          <SettingRow icon={RefreshCw} label="完成判定" value="一键确认" onClick={() => notify('真金奖励前会接入可复核完成证据')} />
          <SettingRow icon={Smartphone} label="安装到手机" value="去安装" onClick={onInstall} />
        </div>
      </section>

      <section className="settings-group" aria-labelledby="data-title">
        <h2 id="data-title">数据</h2>
        <div className="settings-card"><SettingRow icon={Trash2} label="清空本机记录" value="" onClick={onReset} destructive /></div>
      </section>

      <footer className="app-footer"><span className="footer-mark">约</span><p>约己 · 把今天做好</p><small>Version 0.3.0 · 共同约池演示</small></footer>
    </main>
  )
}

function SheetFrame({ eyebrow, title, onClose, children, className = '' }) {
  return (
    <div className="sheet-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className={`sheet ${className}`} role="dialog" aria-modal="true" aria-labelledby="sheet-title">
        <div className="sheet-handle" />
        <div className="sheet-heading">
          <div><p>{eyebrow}</p><h2 id="sheet-title">{title}</h2></div>
          <button className="close-button" type="button" aria-label="关闭" onClick={onClose}><X size={20} /></button>
        </div>
        {children}
      </section>
    </div>
  )
}

function AddSheet({ onClose, onSelect, onCustom }) {
  const [validationMode, setValidationMode] = useState(false)
  return (
    <SheetFrame eyebrow={validationMode ? '七天验证 · 不进入共同约池' : '默认都是确定要做的事'} title="添加约定" onClose={onClose}>
      <div className="preset-stack">
        {PRESETS.map((preset) => (
          <button className={`preset-card tone-${preset.type}`} key={preset.type} type="button" onClick={() => onSelect(preset, validationMode)}>
            <span className="preset-icon"><TaskGlyph type={preset.type} /></span>
            <span className="preset-copy"><strong>{preset.title}</strong><small>{preset.deadline} 前 · {scheduleLabel(preset.weekdays)}</small></span>
            <span className="preset-add"><Plus size={18} /></span>
          </button>
        ))}
      </div>
      <button className="custom-task-button" type="button" onClick={() => onCustom(validationMode)}><Pencil size={15} />自定义约定</button>
      <button className={`validation-link ${validationMode ? 'is-active' : ''}`} type="button" onClick={() => setValidationMode((current) => !current)}>
        {validationMode ? '已设为验证；点此恢复普通约定' : '还没确定？把它作为七天验证 ›'}
      </button>
      <p className="sheet-note">模板可添加后再编辑时间和每周出现日。验证目标不参与共同约池。</p>
    </SheetFrame>
  )
}

function TaskEditor({ task, validationMode = false, onClose, onSave, onDelete }) {
  const [draft, setDraft] = useState(() => task || {
    id: '', type: 'custom', title: '新的约定', deadline: '22:00', weekdays: ALL_DAYS, mode: validationMode ? 'validation' : 'commitment', history: {}, notes: {},
  })

  const toggleDay = (day) => {
    setDraft((current) => {
      const exists = current.weekdays.includes(day)
      const weekdays = exists ? current.weekdays.filter((value) => value !== day) : [...current.weekdays, day]
      return { ...current, weekdays }
    })
  }

  const submit = (event) => {
    event.preventDefault()
    if (!draft.title.trim() || !draft.weekdays.length) return
    onSave({ ...draft, title: draft.title.trim(), detail: `${draft.deadline} 前` })
  }

  return (
    <SheetFrame eyebrow={task ? '修改只影响之后的安排' : draft.mode === 'validation' ? '七天验证' : '自由设置'} title={task ? '编辑约定' : '自定义约定'} onClose={onClose} className="form-sheet">
      <form className="task-form" onSubmit={submit}>
        <label><span>名称</span><input value={draft.title} maxLength={30} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
        <div className="form-row">
          <label><span>类型</span><select value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value })}><option value="meditation">冥想</option><option value="workout">运动</option><option value="read">阅读</option><option value="sleep">睡眠</option><option value="custom">其他</option></select></label>
          <label><span>截止</span><input type="time" value={draft.deadline} onChange={(event) => setDraft({ ...draft, deadline: event.target.value })} /></label>
        </div>
        <fieldset><legend>每周出现日</legend><div className="weekday-grid">{WEEK_DAYS.map((day) => <button key={day.value} className={draft.weekdays.includes(day.value) ? 'is-selected' : ''} type="button" aria-pressed={draft.weekdays.includes(day.value)} onClick={() => toggleDay(day.value)}>{day.label}</button>)}</div></fieldset>
        <button className="primary-action" type="submit" disabled={!draft.title.trim() || !draft.weekdays.length}>保存约定</button>
        {task ? <button className="destructive-link" type="button" onClick={() => onDelete(task.id)}>删除这项约定</button> : null}
      </form>
    </SheetFrame>
  )
}

function NoteSheet({ task, note, onClose, onSave }) {
  const [rating, setRating] = useState(note?.rating || 0)
  const [text, setText] = useState(note?.text || '')
  return (
    <SheetFrame eyebrow="主动记录，不影响结算" title="实践随记" onClose={onClose} className="form-sheet">
      <form className="note-form" onSubmit={(event) => { event.preventDefault(); onSave({ rating, text: text.trim() }) }}>
        <p>{task.title}</p>
        <div className="rating-row" aria-label="今天的感受">
          {[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" aria-label={`${value} 星`} aria-pressed={rating === value} onClick={() => setRating(rating === value ? 0 : value)}><Star size={22} fill={value <= rating ? 'currentColor' : 'none'} /></button>)}
        </div>
        <label><span>想记再记</span><textarea value={text} maxLength={180} placeholder="一句话也可以；留空也没关系" onChange={(event) => setText(event.target.value)} /></label>
        <button className="primary-action" type="submit">保存随记</button>
      </form>
    </SheetFrame>
  )
}

function PoolSheet({ plan, metrics, onClose, onStart, onPause }) {
  return (
    <SheetFrame eyebrow={`${PUBLIC_POOL_DEMO.cycleLabel} · 规则预演`} title="共同约池" onClose={onClose} className="pool-sheet">
      <div className="demo-banner"><ShieldCheck size={17} /><span><strong>机制演示</strong>当前不发生真实奖励转账</span></div>
      <div className="pool-balance">
        <span>本期模拟约池</span><strong>¥{money(PUBLIC_POOL_DEMO.totalFen)}</strong><small>{PUBLIC_POOL_DEMO.participantCount} 人参与 · {PUBLIC_POOL_DEMO.eligibleCount} 人完整履约</small>
      </div>

      {plan && metrics ? (
        <div className="personal-formula">
          <span>你的演示账本</span>
          <p>¥{money(plan.amountFen)} 承诺金 → 完成 {metrics.completedCount}/{plan.targetCount} → 预计退回 ¥{money(metrics.principalRefundFen)}</p>
          <p>未完成份额 ¥{money(metrics.poolContributionFen)} → 进入共同约池</p>
          <strong>{metrics.eligible ? `已获得共享资格 · 当前估算 ¥${money(metrics.estimatedRewardFen)}` : `再完成 ${metrics.remainingCount} 次，获得共享资格`}</strong>
        </div>
      ) : null}

      <ol className="pool-rules">
        <li><span>01</span><p><strong>先守住自己的本金</strong><small>按有效完成份额计算个人预计退回。</small></p></li>
        <li><span>02</span><p><strong>未完成份额形成约池</strong><small>个人账本与共同奖励账本始终分开。</small></p></li>
        <li><span>03</span><p><strong>完整履约者等份共享</strong><small>须无争议且通过完成证据复核；余分冻结待处理。</small></p></li>
      </ol>
      <p className="pool-guardrail">约己奖励认真，不奖励下注。没有排行榜、倒计时、随机抽奖或翻倍刺激。</p>

      {!plan ? <button className="primary-action" type="button" onClick={onStart}>用第一项约定开始本机演示</button> : null}
      {plan && !plan.pauseUsed ? <button className="secondary-action" type="button" onClick={onPause}>今天有事，使用本期一次暂缓</button> : null}
      {plan?.pauseUsed ? <p className="pause-used">本期暂缓已使用 · 目标次数不减少，截止日顺延一天</p> : null}
    </SheetFrame>
  )
}

export default function App() {
  const initial = useMemo(loadState, [])
  const [active, setActive] = useState('today')
  const [tasks, setTasks] = useState(initial.tasks)
  const [plan, setPlan] = useState(initial.plan)
  const [showAdd, setShowAdd] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [editingNew, setEditingNew] = useState(false)
  const [newValidationMode, setNewValidationMode] = useState(false)
  const [noteTask, setNoteTask] = useState(null)
  const [showPool, setShowPool] = useState(false)
  const [toast, setToast] = useState('')
  const [installPrompt, setInstallPrompt] = useState(null)
  const metrics = useMemo(() => planMetrics(plan, tasks), [plan, tasks])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ tasks, plan }))
  }, [tasks, plan])

  useEffect(() => {
    const handleInstall = (event) => { event.preventDefault(); setInstallPrompt(event) }
    window.addEventListener('beforeinstallprompt', handleInstall)
    return () => window.removeEventListener('beforeinstallprompt', handleInstall)
  }, [])

  useEffect(() => {
    const requestedTask = new URLSearchParams(window.location.search).get('complete')
    if (!requestedTask) return
    setTasks((current) => current.map((task) => task.type === requestedTask ? { ...task, history: { ...task.history, [dateKey()]: true } } : task))
    window.history.replaceState({}, '', window.location.pathname)
  }, [])

  const notify = (message) => {
    setToast(message)
    window.clearTimeout(window.__yuejiToast)
    window.__yuejiToast = window.setTimeout(() => setToast(''), 2600)
  }

  const toggleTask = (id) => {
    const today = dateKey()
    setTasks((current) => current.map((task) => task.id === id ? { ...task, history: { ...task.history, [today]: !task.history?.[today] } } : task))
  }

  const addPreset = (preset, validationMode) => {
    const duplicate = tasks.find((task) => task.type === preset.type && task.title === preset.title)
    if (duplicate) notify('这项约定已经添加了，可以直接编辑时间')
    else {
      setTasks((current) => [...current, normaliseTask({ ...preset, id: `${preset.type}-${Date.now()}`, mode: validationMode ? 'validation' : 'commitment', history: {}, notes: {} }, current.length)])
      notify(validationMode ? '已作为七天验证加入' : '已加入约定')
    }
    setShowAdd(false)
  }

  const saveTask = (draft) => {
    const next = normaliseTask({ ...draft, id: draft.id || `custom-${Date.now()}` }, tasks.length)
    setTasks((current) => current.some((task) => task.id === next.id) ? current.map((task) => task.id === next.id ? next : task) : [...current, next])
    setEditingTask(null)
    setEditingNew(false)
    notify('约定已保存')
  }

  const deleteTask = (id) => {
    if (!window.confirm('删除这项约定？已有历史记录也会从本机移除。')) return
    setTasks((current) => current.filter((task) => task.id !== id))
    if (plan?.taskId === id) setPlan(null)
    setEditingTask(null)
    notify('约定已删除')
  }

  const saveNote = (note) => {
    const today = dateKey()
    setTasks((current) => current.map((task) => task.id === noteTask.id ? { ...task, notes: { ...task.notes, [today]: note } } : task))
    setNoteTask(null)
    notify('今天的随记已保存')
  }

  const startDemoPlan = () => {
    const task = tasks.find((item) => item.mode !== 'validation')
    if (!task) { setShowPool(false); notify('先添加一项普通约定，再开始演示'); return }
    const targetCount = task.type === 'workout' ? 3 : 5
    setPlan({
      id: `demo-${Date.now()}`,
      mode: 'public_demo',
      taskId: task.id,
      amountFen: 990,
      targetCount,
      startDate: dateKey(),
      endDate: dateAfter(6),
      pauseUsed: false,
    })
    setShowPool(false)
    notify('共同约池演示已开始；不会发生真实扣款')
  }

  const usePause = () => {
    if (!plan || plan.pauseUsed) return
    if (!window.confirm('使用本期唯一一次暂缓？目标次数不减少，截止日只顺延一天。')) return
    const end = new Date(`${plan.endDate}T12:00:00`)
    end.setDate(end.getDate() + 1)
    setPlan({ ...plan, pauseUsed: true, pausedDate: dateKey(), endDate: dateKey(end) })
    setShowPool(false)
    notify('已暂缓一次，截止日顺延一天')
  }

  const installApp = async () => {
    if (installPrompt) { installPrompt.prompt(); await installPrompt.userChoice; setInstallPrompt(null) }
    else notify('请在浏览器菜单中选择“添加到主屏幕”')
  }

  const reset = () => {
    if (!window.confirm('清空这台设备上的全部记录？')) return
    setTasks(STARTER_TASKS)
    setPlan(null)
    localStorage.removeItem(STORAGE_KEY)
    notify('本机记录已清空')
  }

  return (
    <div className="app-shell">
      <div className="app-frame">
        {active === 'today' && <Today tasks={tasks} plan={plan} metrics={metrics} onToggle={toggleTask} onAdd={() => setShowAdd(true)} onEdit={setEditingTask} onNote={setNoteTask} onPool={() => setShowPool(true)} onProfile={() => setActive('profile')} />}
        {active === 'history' && <History tasks={tasks} />}
        {active === 'profile' && <Profile onInstall={installApp} onReset={reset} onPool={() => setShowPool(true)} notify={notify} />}

        <nav className="bottom-nav" aria-label="主要导航">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            return <button key={item.id} type="button" className={active === item.id ? 'is-active' : ''} aria-current={active === item.id ? 'page' : undefined} onClick={() => setActive(item.id)}><span className="nav-icon"><Icon size={21} strokeWidth={active === item.id ? 2.4 : 1.9} /></span><span>{item.label}</span></button>
          })}
        </nav>
      </div>

      {showAdd && <AddSheet onClose={() => setShowAdd(false)} onSelect={addPreset} onCustom={(validationMode) => { setShowAdd(false); setNewValidationMode(validationMode); setEditingNew(true) }} />}
      {editingTask && <TaskEditor task={editingTask} onClose={() => setEditingTask(null)} onSave={saveTask} onDelete={deleteTask} />}
      {editingNew && <TaskEditor validationMode={newValidationMode} onClose={() => setEditingNew(false)} onSave={saveTask} />}
      {noteTask && <NoteSheet task={noteTask} note={noteTask.notes?.[dateKey()]} onClose={() => setNoteTask(null)} onSave={saveNote} />}
      {showPool && <PoolSheet plan={plan} metrics={metrics} onClose={() => setShowPool(false)} onStart={startDemoPlan} onPause={usePause} />}
      <div className={`toast ${toast ? 'is-visible' : ''}`} role="status" aria-live="polite">{toast}</div>
    </div>
  )
}
