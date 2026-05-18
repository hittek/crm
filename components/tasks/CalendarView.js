import { useState, useEffect, useCallback } from 'react'
import Icons from '../ui/Icons'
import { getFullName } from '../../lib/utils'
import { useI18n } from '../../lib/i18n'

// ── helpers ───────────────────────────────────────────────────────────────────

function startOfMonth(year, month) {
  return new Date(year, month, 1)
}

function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

/** Returns array of {date, isCurrentMonth} for the 6-week grid */
function buildGrid(year, month) {
  const first = startOfMonth(year, month)
  // Monday-first week (0=Mon … 6=Sun), convert Sun=0 → 6
  const startDay = (first.getDay() + 6) % 7
  const total = daysInMonth(year, month)

  const cells = []

  // Leading days from previous month
  const prevMonthDays = daysInMonth(year, month - 1)
  for (let i = startDay - 1; i >= 0; i--) {
    cells.push({ date: new Date(year, month - 1, prevMonthDays - i), isCurrentMonth: false })
  }
  // Current month
  for (let d = 1; d <= total; d++) {
    cells.push({ date: new Date(year, month, d), isCurrentMonth: true })
  }
  // Trailing days — fill to complete last week
  let trailing = 1
  while (cells.length % 7 !== 0) {
    cells.push({ date: new Date(year, month + 1, trailing++), isCurrentMonth: false })
  }
  return cells
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

function dateKey(date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

// ── type / priority colors ─────────────────────────────────────────────────

const TYPE_COLORS = {
  meeting: 'bg-purple-100 text-purple-700 border-purple-200',
  call:    'bg-blue-100   text-blue-700   border-blue-200',
  email:   'bg-cyan-100   text-cyan-700   border-cyan-200',
  task:    'bg-gray-100   text-gray-700   border-gray-200',
}

const PRIORITY_DOT = {
  high:   'bg-red-500',
  medium: 'bg-yellow-400',
  low:    'bg-green-400',
}

const TYPE_ICON_MAP = {
  meeting: Icons.calendar,
  call:    Icons.phone,
  email:   Icons.mail,
  task:    Icons.tasks,
}

const WEEKDAYS_ES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const MONTHS_ES   = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

// ── main component ─────────────────────────────────────────────────────────

export default function CalendarView({ onNewTask, onTaskSelect }) {
  const today = new Date()
  const [year,  setYear]  = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState(null) // Date | null
  const { t } = useI18n()

  // ── data fetch ──────────────────────────────────────────────────────────

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch a wide window: prev month, current, next — so the grid's
      // leading/trailing cells also show tasks.
      const from = new Date(year, month - 1, 1).toISOString()
      const to   = new Date(year, month + 2, 0).toISOString()
      const r = await fetch(`/api/tasks?sortBy=dueDate&sortOrder=asc&limit=500&from=${from}&to=${to}`)
      if (r.ok) {
        const data = await r.json()
        setTasks(data.data || [])
      }
    } catch (e) {
      console.error('CalendarView fetch error:', e)
    }
    setLoading(false)
  }, [year, month])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  // ── navigation ──────────────────────────────────────────────────────────

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else              { setMonth(m => m - 1) }
    setSelectedDay(null)
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else               { setMonth(m => m + 1) }
    setSelectedDay(null)
  }
  function goToday() {
    setYear(today.getFullYear())
    setMonth(today.getMonth())
    setSelectedDay(today)
  }

  // ── task → day map ──────────────────────────────────────────────────────

  const tasksByDay = {}
  for (const task of tasks) {
    if (!task.dueDate) continue
    const d = new Date(task.dueDate)
    const k = dateKey(d)
    if (!tasksByDay[k]) tasksByDay[k] = []
    tasksByDay[k].push(task)
  }

  const grid = buildGrid(year, month)

  // ── selected day tasks ─────────────────────────────────────────────────

  const selectedDayTasks = selectedDay
    ? (tasksByDay[dateKey(selectedDay)] || [])
    : []

  // ── render ─────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white">

      {/* ── Header ── */}
      <div className="px-4 lg:px-6 py-4 border-b border-gray-200 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-900">
            {MONTHS_ES[month]} {year}
          </h2>
          <button
            onClick={goToday}
            className="px-2.5 py-1 text-xs font-medium rounded-md border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            Hoy
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={prevMonth}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Mes anterior"
          >
            <Icons.chevronLeft className="w-4 h-4 text-gray-600" />
          </button>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Mes siguiente"
          >
            <Icons.chevronRight className="w-4 h-4 text-gray-600" />
          </button>
          <button
            onClick={onNewTask}
            className="ml-2 btn-primary py-1.5 px-3 text-sm"
          >
            <Icons.add className="w-4 h-4 lg:mr-1.5" />
            <span className="hidden lg:inline">Nueva tarea</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {/* ── Weekday headers ── */}
        <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50 sticky top-0 z-10">
          {WEEKDAYS_ES.map(d => (
            <div key={d} className="py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wide">
              {d}
            </div>
          ))}
        </div>

        {/* ── Day grid ── */}
        {loading ? (
          <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
            Cargando…
          </div>
        ) : (
          <div className="grid grid-cols-7 divide-x divide-gray-100">
            {grid.map(({ date, isCurrentMonth }, idx) => {
              const key    = dateKey(date)
              const dayTasks = tasksByDay[key] || []
              const isToday  = isSameDay(date, today)
              const isSelected = selectedDay && isSameDay(date, selectedDay)
              const MAX_VISIBLE = 3

              return (
                <div
                  key={idx}
                  onClick={() => setSelectedDay(isSelected ? null : date)}
                  className={`min-h-[90px] lg:min-h-[110px] p-1.5 border-b border-gray-100 cursor-pointer transition-colors ${
                    isSelected ? 'bg-primary-50' :
                    isToday    ? 'bg-blue-50/40' :
                    isCurrentMonth ? 'hover:bg-gray-50' : 'bg-gray-50/50'
                  }`}
                >
                  {/* Day number */}
                  <div className="flex justify-end mb-1">
                    <span className={`w-6 h-6 flex items-center justify-center text-xs font-medium rounded-full ${
                      isToday
                        ? 'bg-primary-600 text-white'
                        : isCurrentMonth
                          ? 'text-gray-900'
                          : 'text-gray-400'
                    }`}>
                      {date.getDate()}
                    </span>
                  </div>

                  {/* Task pills */}
                  <div className="space-y-0.5">
                    {dayTasks.slice(0, MAX_VISIBLE).map(task => {
                      const colors = TYPE_COLORS[task.type] || TYPE_COLORS.task
                      const dot    = PRIORITY_DOT[task.priority]
                      const Icon   = TYPE_ICON_MAP[task.type] || Icons.tasks
                      return (
                        <div
                          key={task.id}
                          onClick={(e) => { e.stopPropagation(); onTaskSelect?.(task) }}
                          className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium border truncate cursor-pointer hover:opacity-80 transition-opacity ${colors} ${
                            task.status === 'completed' ? 'opacity-50 line-through' : ''
                          }`}
                          title={task.title}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
                          <Icon className="w-3 h-3 shrink-0 opacity-70" />
                          <span className="truncate">{task.title}</span>
                        </div>
                      )
                    })}
                    {dayTasks.length > MAX_VISIBLE && (
                      <div className="text-[10px] text-gray-500 pl-1 font-medium">
                        +{dayTasks.length - MAX_VISIBLE} más
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Day detail panel (slides up) ── */}
      {selectedDay && (
        <div className="border-t border-gray-200 bg-white shrink-0 max-h-64 overflow-y-auto">
          <div className="px-4 lg:px-6 py-3 flex items-center justify-between border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">
              {selectedDay.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onNewTask?.()}
                className="text-xs text-primary-600 hover:text-primary-700 font-medium"
              >
                + Nueva tarea
              </button>
              <button
                onClick={() => setSelectedDay(null)}
                className="p-1 rounded hover:bg-gray-100"
              >
                <Icons.x className="w-3.5 h-3.5 text-gray-400" />
              </button>
            </div>
          </div>

          {selectedDayTasks.length === 0 ? (
            <p className="px-4 lg:px-6 py-4 text-sm text-gray-400">Sin tareas este día.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {selectedDayTasks.map(task => {
                const colors = TYPE_COLORS[task.type] || TYPE_COLORS.task
                const Icon   = TYPE_ICON_MAP[task.type] || Icons.tasks
                return (
                  <div
                    key={task.id}
                    onClick={() => onTaskSelect?.(task)}
                    className="flex items-center gap-3 px-4 lg:px-6 py-3 hover:bg-gray-50 cursor-pointer"
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center border ${colors}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium text-gray-900 truncate ${
                        task.status === 'completed' ? 'line-through text-gray-400' : ''
                      }`}>
                        {task.title}
                      </p>
                      {(task.contact || task.deal) && (
                        <p className="text-xs text-gray-500 truncate">
                          {task.contact
                            ? getFullName(task.contact.firstName, task.contact.lastName)
                            : task.deal?.title}
                        </p>
                      )}
                    </div>
                    <span className={`w-2 h-2 rounded-full shrink-0 ${PRIORITY_DOT[task.priority] || 'bg-gray-300'}`} />
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
