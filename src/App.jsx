import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  CalendarDays,
  Check,
  ChevronRight,
  CircleUserRound,
  Dumbbell,
  Moon,
  Plus,
  RefreshCw,
  Smartphone,
  Trash2,
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
  { id: 'today', label: '今天', icon: Check },
  { id: 'history', label: '记录', icon: CalendarDays },
  { id: 'profile', label: '我的', icon: CircleUserRound },
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

function TaskGlyph({ type, size = 20 }) {
  if (type === 'workout') return <Dumbbell size={size} strokeWidth={1.8} />
  if (type === 'sleep') return <Moon size={size} strokeWidth={1.8} />
  return <Activity size={size} strokeWidth={1.8} />
}

function Today({ tasks, onToggle, onAdd }) {
  const today = dateKey()
  const completed = tasks.filter((task) => task.history?.[today]).length
  const now = new Date()
  const dateText = new Intl.DateTimeFormat('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(now)

  return (
    <main id="main-content" className="page page-today">
      <header className="page-heading">
        <p>{dateText}</p>
        <h1>今天</h1>
        <span>{completed === tasks.length ? '今天的事都做完了。' : `${completed} / ${tasks.length} 已完成`}</span>
      </header>

      <section className="task-list" aria-label="今日约定">
        {tasks.map((task) => {
          const done = Boolean(task.history?.[today])
          return (
            <button
              className={`task-row ${done ? 'is-done' : ''}`}
              key={task.id}
              type="button"
              aria-pressed={done}
              onClick={() => onToggle(task.id)}
            >
              <span className="task-check" aria-hidden="true">{done && <Check size={17} strokeWidth={2.6} />}</span>
              <span className="task-copy">
                <strong>{task.title}</strong>
                <small>{task.detail} · 承诺额 ¥{task.stake.toFixed(1)}</small>
              </span>
              <span className="task-glyph" aria-hidden="true"><TaskGlyph type={task.type} /></span>
            </button>
          )
        })}
      </section>

      <button className="quiet-add" type="button" onClick={onAdd}>
        <Plus size={18} />
        加一件事
      </button>

      <p className="one-tap-note">做完后点一下。App 上线后由健康数据自动完成。</p>
    </main>
  )
}

function History({ tasks }) {
  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const date = new Date()
    date.setDate(date.getDate() - (6 - index))
    const key = dateKey(date)
    return {
      key,
      weekday: new Intl.DateTimeFormat('zh-CN', { weekday: 'short' }).format(date),
      day: date.getDate(),
      completed: tasks.filter((task) => task.history?.[key]).length,
    }
  }), [tasks])

  const completedDays = days.filter((day) => day.completed === tasks.length && tasks.length > 0).length

  return (
    <main id="main-content" className="page">
      <header className="page-heading compact-heading">
        <p>最近 7 天</p>
        <h1>记录</h1>
        <span>{completedDays} 天全部完成</span>
      </header>

      <section className="week-strip" aria-label="最近七天完成记录">
        {days.map((day) => (
          <div className={`day-cell ${day.completed === tasks.length && tasks.length ? 'is-complete' : ''}`} key={day.key}>
            <small>{day.weekday}</small>
            <strong>{day.day}</strong>
            <span aria-label={`${day.completed}项完成`}>{day.completed || '·'}</span>
          </div>
        ))}
      </section>

      <section className="plain-section" aria-labelledby="record-title">
        <h2 id="record-title">今天</h2>
        {tasks.map((task) => {
          const done = Boolean(task.history?.[dateKey()])
          return (
            <div className="record-row" key={task.id}>
              <span className={`record-dot ${done ? 'is-done' : ''}`} />
              <span>{task.title}</span>
              <small>{done ? '完成' : '未完成'}</small>
            </div>
          )
        })}
      </section>
    </main>
  )
}

function SettingRow({ icon: Icon, label, value, onClick, destructive = false }) {
  return (
    <button className={`setting-row ${destructive ? 'is-destructive' : ''}`} type="button" onClick={onClick}>
      <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
      <span>{label}</span>
      <small>{value}</small>
      <ChevronRight size={17} strokeWidth={1.8} aria-hidden="true" />
    </button>
  )
}

function Profile({ onInstall, onReset, notify }) {
  return (
    <main id="main-content" className="page">
      <header className="page-heading compact-heading">
        <p>账户与连接</p>
        <h1>我的</h1>
      </header>

      <section className="plain-section setting-section" aria-label="账户设置">
        <SettingRow icon={WalletCards} label="微信支付" value="待开通" onClick={() => notify('绑定将在微信小程序内完成')} />
        <SettingRow icon={RefreshCw} label="完成判定" value="一键确认" onClick={() => notify('原生 App 将接入 Apple 健康与 Health Connect')} />
        <SettingRow icon={Smartphone} label="快速打开" value="安装到桌面" onClick={onInstall} />
      </section>

      <section className="plain-section about-section" aria-labelledby="about-title">
        <h2 id="about-title">约己</h2>
        <p>把目标缩成今天的一件事。做完就结束，不做多余的事。</p>
      </section>

      <section className="plain-section setting-section last-section" aria-label="数据设置">
        <SettingRow icon={Trash2} label="清空本机记录" value="" onClick={onReset} destructive />
      </section>
    </main>
  )
}

function AddSheet({ onClose, onSelect }) {
  return (
    <div className="sheet-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="sheet" role="dialog" aria-modal="true" aria-labelledby="add-title">
        <div className="sheet-handle" />
        <button className="icon-button sheet-close" type="button" aria-label="关闭" onClick={onClose}><X size={20} /></button>
        <p>不用填写</p>
        <h2 id="add-title">加一件事</h2>
        <div className="preset-list">
          {PRESETS.map((preset) => (
            <button key={preset.type} type="button" onClick={() => onSelect(preset)}>
              <span className="preset-icon"><TaskGlyph type={preset.type} /></span>
              <span>
                <strong>{preset.title}</strong>
                <small>{preset.detail} · ¥{preset.stake.toFixed(1)}</small>
              </span>
              <Plus size={18} />
            </button>
          ))}
        </div>
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
      notify('这件事已经在今天了')
    } else {
      setTasks((current) => [...current, { ...preset, id: `${preset.type}-${Date.now()}`, history: {} }])
      notify('已加入今天')
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
        <header className="brand-bar">
          <a href="./" aria-label="约己首页">约己</a>
          <span>YUEJI</span>
        </header>

        {active === 'today' && <Today tasks={tasks} onToggle={toggleTask} onAdd={() => setShowAdd(true)} />}
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
                <Icon size={21} strokeWidth={active === item.id ? 2.2 : 1.7} />
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
