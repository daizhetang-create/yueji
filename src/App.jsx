import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  BarChart3,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  Dumbbell,
  House,
  Moon,
  Plus,
  RefreshCw,
  Smartphone,
  Trash2,
  UserRound,
  WalletCards,
  X,
} from 'lucide-react'

const STORAGE_KEY = 'yueji-simple-state-v1'

const STARTER_TASKS = [
  {
    id: 'meditation',
    type: 'meditation',
    title: '冥想 10 分钟',
    detail: '22:30 前',
    stake: 9.9,
    history: {},
  },
  {
    id: 'workout',
    type: 'workout',
    title: '运动 20 分钟',
    detail: '21:30 前',
    stake: 9.9,
    history: {},
  },
]

const PRESETS = [
  { type: 'meditation', title: '冥想 10 分钟', detail: '22:30 前', stake: 9.9 },
  { type: 'workout', title: '运动 20 分钟', detail: '21:30 前', stake: 9.9 },
  { type: 'sleep', title: '23:00 前睡觉', detail: '23:00 前', stake: 9.9 },
]

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

function loadTasks() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY))
    return Array.isArray(stored?.tasks) ? stored.tasks : STARTER_TASKS
  } catch {
    return STARTER_TASKS
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

function TaskGlyph({ type, size = 21 }) {
  if (type === 'workout') return <Dumbbell size={size} strokeWidth={2} />
  if (type === 'sleep') return <Moon size={size} strokeWidth={2} />
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
        <strong>{finished ? '全部完成' : `还有 ${remaining} 项`}</strong>
        <small>{finished ? '今天可以安心收工了' : '只处理今天，不追赶昨天'}</small>
      </div>
      <div className="progress-ring" style={{ '--progress': `${progress}%` }} aria-hidden="true">
        <div>
          <strong>{completed}</strong>
          <span>/{total}</span>
        </div>
      </div>
    </section>
  )
}

function TaskCard({ task, done, onToggle }) {
  return (
    <button
      className={`task-card tone-${task.type} ${done ? 'is-done' : ''}`}
      type="button"
      aria-pressed={done}
      onClick={onToggle}
    >
      <span className="task-icon" aria-hidden="true"><TaskGlyph type={task.type} /></span>
      <span className="task-content">
        <strong>{task.title}</strong>
        <span className="task-meta">
          <span><Clock3 size={13} />{task.detail}</span>
          <span>承诺 ¥{task.stake.toFixed(1)}</span>
        </span>
      </span>
      <span className="complete-button" aria-hidden="true">
        {done ? <Check size={19} strokeWidth={2.8} /> : null}
      </span>
    </button>
  )
}

function Today({ tasks, onToggle, onAdd, onProfile }) {
  const today = dateKey()
  const completed = tasks.filter((task) => task.history?.[today]).length
  const now = new Date()
  const dateText = new Intl.DateTimeFormat('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(now).replace('周', ' · 周')

  return (
    <main id="main-content" className="app-page home-page">
      <AppHeader dateText={dateText} onProfile={onProfile} />
      <ProgressCard completed={completed} total={tasks.length} />

      <section className="task-section" aria-labelledby="today-tasks-title">
        <div className="section-heading">
          <h2 id="today-tasks-title">今日约定</h2>
          <span>{tasks.length} 项</span>
        </div>
        <div className="task-stack">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              done={Boolean(task.history?.[today])}
              onToggle={() => onToggle(task.id)}
            />
          ))}
        </div>
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
    const completed = tasks.filter((task) => task.history?.[key]).length
    return {
      key,
      weekday: new Intl.DateTimeFormat('zh-CN', { weekday: 'short' }).format(date).replace('周', ''),
      day: date.getDate(),
      completed,
      full: tasks.length > 0 && completed === tasks.length,
      today: index === 6,
    }
  }), [tasks])

  const completedDays = days.filter((day) => day.full).length
  const completedTasks = days.reduce((sum, day) => sum + day.completed, 0)
  const possible = days.length * tasks.length
  const rate = possible ? Math.round((completedTasks / possible) * 100) : 0

  return (
    <main id="main-content" className="app-page history-page">
      <header className="simple-header">
        <p>最近 7 天</p>
        <h1>记录</h1>
      </header>

      <section className="stat-grid" aria-label="最近七天统计">
        <article className="stat-card stat-primary">
          <span>完成率</span>
          <strong>{rate}<small>%</small></strong>
          <p>{completedTasks} 次完成</p>
        </article>
        <article className="stat-card">
          <span>完整天数</span>
          <strong>{completedDays}<small>天</small></strong>
          <p>两项都完成</p>
        </article>
      </section>

      <section className="calendar-card" aria-labelledby="week-title">
        <div className="card-heading">
          <div>
            <h2 id="week-title">本周</h2>
            <p>{new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long' }).format(new Date())}</p>
          </div>
          <CalendarDays size={20} aria-hidden="true" />
        </div>
        <div className="week-row">
          {days.map((day) => (
            <div className={`day-pill ${day.full ? 'is-complete' : ''} ${day.today ? 'is-today' : ''}`} key={day.key}>
              <small>{day.weekday}</small>
              <strong>{day.day}</strong>
              <span>{day.completed ? <Check size={11} strokeWidth={3} /> : null}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="record-section" aria-labelledby="record-title">
        <div className="section-heading">
          <h2 id="record-title">今天</h2>
          <span>{tasks.filter((task) => task.history?.[dateKey()]).length}/{tasks.length}</span>
        </div>
        <div className="record-card">
          {tasks.map((task) => {
            const done = Boolean(task.history?.[dateKey()])
            return (
              <div className="record-item" key={task.id}>
                <span className={`mini-task-icon tone-${task.type}`}><TaskGlyph type={task.type} size={17} /></span>
                <span className="record-copy">
                  <strong>{task.title}</strong>
                  <small>{task.detail}</small>
                </span>
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

function Profile({ onInstall, onReset, notify }) {
  return (
    <main id="main-content" className="app-page profile-page">
      <header className="simple-header">
        <p>账户与偏好</p>
        <h1>我的</h1>
      </header>

      <section className="identity-card" aria-label="当前账户">
        <span className="app-avatar">约</span>
        <span>
          <strong>约己用户</strong>
          <small>数据保存在当前设备</small>
        </span>
        <span className="identity-status">未登录</span>
      </section>

      <section className="settings-group" aria-labelledby="connection-title">
        <h2 id="connection-title">连接</h2>
        <div className="settings-card">
          <SettingRow icon={WalletCards} label="微信支付" value="待开通" onClick={() => notify('绑定将在微信小程序内完成')} />
          <SettingRow icon={RefreshCw} label="完成判定" value="一键确认" onClick={() => notify('原生 App 将接入健康数据自动判定')} />
          <SettingRow icon={Smartphone} label="安装到手机" value="去安装" onClick={onInstall} />
        </div>
      </section>

      <section className="settings-group" aria-labelledby="data-title">
        <h2 id="data-title">数据</h2>
        <div className="settings-card">
          <SettingRow icon={Trash2} label="清空本机记录" value="" onClick={onReset} destructive />
        </div>
      </section>

      <footer className="app-footer">
        <span className="footer-mark">约</span>
        <p>约己 · 把今天做好</p>
        <small>Version 0.2</small>
      </footer>
    </main>
  )
}

function AddSheet({ onClose, onSelect }) {
  return (
    <div className="sheet-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="sheet" role="dialog" aria-modal="true" aria-labelledby="add-title">
        <div className="sheet-handle" />
        <div className="sheet-heading">
          <div>
            <p>选择一个模板</p>
            <h2 id="add-title">添加约定</h2>
          </div>
          <button className="close-button" type="button" aria-label="关闭" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="preset-stack">
          {PRESETS.map((preset) => (
            <button className={`preset-card tone-${preset.type}`} key={preset.type} type="button" onClick={() => onSelect(preset)}>
              <span className="preset-icon"><TaskGlyph type={preset.type} /></span>
              <span className="preset-copy">
                <strong>{preset.title}</strong>
                <small>{preset.detail} · 承诺 ¥{preset.stake.toFixed(1)}</small>
              </span>
              <span className="preset-add"><Plus size={18} /></span>
            </button>
          ))}
        </div>
        <p className="sheet-note">选择后立即加入今天，不需要填写表单。</p>
      </section>
    </div>
  )
}

export default function App() {
  const [active, setActive] = useState('today')
  const [tasks, setTasks] = useState(loadTasks)
  const [showAdd, setShowAdd] = useState(false)
  const [toast, setToast] = useState('')
  const [installPrompt, setInstallPrompt] = useState(null)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ tasks }))
  }, [tasks])

  useEffect(() => {
    const handleInstall = (event) => {
      event.preventDefault()
      setInstallPrompt(event)
    }
    window.addEventListener('beforeinstallprompt', handleInstall)
    return () => window.removeEventListener('beforeinstallprompt', handleInstall)
  }, [])

  useEffect(() => {
    const requestedTask = new URLSearchParams(window.location.search).get('complete')
    if (!requestedTask) return
    setTasks((current) => current.map((task) => (
      task.type === requestedTask
        ? { ...task, history: { ...task.history, [dateKey()]: true } }
        : task
    )))
    window.history.replaceState({}, '', window.location.pathname)
  }, [])

  const notify = (message) => {
    setToast(message)
    window.clearTimeout(window.__yuejiToast)
    window.__yuejiToast = window.setTimeout(() => setToast(''), 2600)
  }

  const toggleTask = (id) => {
    const today = dateKey()
    setTasks((current) => current.map((task) => (
      task.id === id
        ? { ...task, history: { ...task.history, [today]: !task.history?.[today] } }
        : task
    )))
  }

  const addPreset = (preset) => {
    const existing = tasks.find((task) => task.type === preset.type)
    if (existing) {
      notify('这项约定已经添加了')
    } else {
      setTasks((current) => [...current, { ...preset, id: `${preset.type}-${Date.now()}`, history: {} }])
      notify('已加入今日约定')
    }
    setShowAdd(false)
  }

  const installApp = async () => {
    if (installPrompt) {
      installPrompt.prompt()
      await installPrompt.userChoice
      setInstallPrompt(null)
    } else {
      notify('请在浏览器菜单中选择“添加到主屏幕”')
    }
  }

  const reset = () => {
    if (!window.confirm('清空这台设备上的全部记录？')) return
    setTasks(STARTER_TASKS)
    localStorage.removeItem(STORAGE_KEY)
    notify('本机记录已清空')
  }

  return (
    <div className="app-shell">
      <div className="app-frame">
        {active === 'today' && (
          <Today
            tasks={tasks}
            onToggle={toggleTask}
            onAdd={() => setShowAdd(true)}
            onProfile={() => setActive('profile')}
          />
        )}
        {active === 'history' && <History tasks={tasks} />}
        {active === 'profile' && <Profile onInstall={installApp} onReset={reset} notify={notify} />}

        <nav className="bottom-nav" aria-label="主要导航">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                type="button"
                className={active === item.id ? 'is-active' : ''}
                aria-current={active === item.id ? 'page' : undefined}
                onClick={() => setActive(item.id)}
              >
                <span className="nav-icon"><Icon size={21} strokeWidth={active === item.id ? 2.4 : 1.9} /></span>
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {showAdd && <AddSheet onClose={() => setShowAdd(false)} onSelect={addPreset} />}
      <div className={`toast ${toast ? 'is-visible' : ''}`} role="status" aria-live="polite">{toast}</div>
    </div>
  )
}
