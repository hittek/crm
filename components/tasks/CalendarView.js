import { useState, useEffect, useCallback } from 'react'
import Icons from '../ui/Icons'
import { getFullName } from '../../lib/utils'
import { useTaskTypes } from '../../lib/SettingsContext'

// ── helpers ───────────────────────────────────────────────────────────────────

function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

/** Returns array of {date, isCurrentMonth} for a Mon-first 6-week grid */
function buildGrid(year, month) {
  const first    = new Date(year, month, 1)
  const startDay = (first.getDay() + 6) % 7 // Mon=0 … Sun=6
  const total    = daysInMonth(year, month)
  const prevDays = daysInMonth(year, month - 1)
  const cells    = []

  for (let i = startDay - 1; i >= 0; i--)
    cells.push({ date: new Date(year, month - 1, prevDays - i), isCurrentMonth: false })
  for (let d = 1; d <= total; d++)
    cells.push({ date: new Date(year, month, d), isCurrentMonth: true })
  let trailing = 1
  while (cells.length % 7 !== 0)
    cells.push({ date: new Date(year, month + 1, trailing++), isCurrentMonth: false })

  return cells
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

function dateKey(d) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

// ── color maps ────────────────────────────────────────────────────────────────

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

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const MONTHS   = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

// ── CalendarView ──────────────────────────────────────────────────────────────

export default function CalendarView({ onNewTask, onTaskSelect }) {
  const today = new Date()
  const taskTypes = useTaskTypes()
  const getTypeEmoji = (typeId) => taskTypes.find(t => t.id === typeId)?.emoji || '✅'
  const [year,        setYear]        = useState(today.getFullYear())
  const [month,       setMonth]       = useState(today.getMonth())
  const [tasks,       setTasks]       = useState([])
  const [loading,     setLoading]     = useState(true)
  const [selectedDay, setSelectedDay] = useState(null)

  // ── fetch ────────────────────────────────────────────────────────────────
  const fetchTasks = useCallback(async () => {
    setLoading(true)
    try {
      const from = new Date(year, month - 1, 1).toISOString()
      const to   = new Date(year, month + 2, 0).toISOString()
      const r = await fetch(`/api/tasks?sortBy=dueDate&sortOrder=asc&limit=500&from=${from}&to=${to}`)
      if (r.ok) { const d = await r.json(); setTasks(d.data || []) }
    } catch (e) { console.error('CalendarView fetch:', e) }
    setLoading(false)
  }, [year, month])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  // ── navigation ───────────────────────────────────────────────────────────
  function prevMonth() {
    setSelectedDay(null)
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else              setMonth(m => m - 1)
  }
  function nextMonth() {
    setSelectedDay(null)
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else               setMonth(m => m + 1)
  }
  function goToday() {
    setYear(today.getFullYear())
    setMonth(today.getMonth())
    setSelectedDay(today)
  }

  // ── task map ─────────────────────────────────────────────────────────────
  const tasksByDay = {}
  for (const t of tasks) {
    if (!t.dueDate) continue
    const k = dateKey(new Date(t.dueDate))
    if (!tasksByDay[k]) tasksByDay[k] = []
    tasksByDay[k].push(t)
  }

  const grid = buildGrid(year, month)
  const selectedDayTasks = selectedDay ? (tasksByDay[dateKey(selectedDay)] || []) : []

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white min-h-0">

      {/* Header */}
      <div className="px-3 sm:px-4 lg:px-6 py-3 border-b border-gray-200 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 leading-tight">
            {MONTHS[month]} {year}
          </h2>
          <button
            onClick={goToday}
            className="px-2 py-0.5 text-xs font-medium rounded-md border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            Hoy
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" aria-label="Mes anterior">
            <Icons.chevronLeft className="w-4 h-4 text-gray-600" />
          </button>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" aria-label="Mes siguiente">
            <Icons.chevronRight className="w-4 h-4 text-gray-600" />
          </button>
          <button onClick={onNewTask} className="btn-primary py-1.5 px-2.5 sm:px-3 text-xs sm:text-sm ml-1">
            <Icons.add className="w-4 h-4 sm:mr-1.5" />
            <span className="hidden sm:inline">Nueva tarea</span>
          </button>
        </div>
      </div>

      {/* Grid area */}
      <div className="flex-1 overflow-auto min-h-0">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50 sticky top-0 z-10">
          {WEEKDAYS.map((d, i) => (
            <div key={d} className="py-1.5 sm:py-2 text-center">
              {/* Show 1 letter on mobile, 3 on larger */}
              <span className="sm:hidden text-[10px] font-medium text-gray-500 uppercase">{d[0]}</span>
              <span className="hidden sm:inline text-xs font-medium text-gray-500 uppercase">{d}</span>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48 text-sm text-gray-400">Cargando…</div>
        ) : (
          <div className="grid grid-cols-7 divide-x divide-gray-100">
            {grid.map(({ date, isCurrentMonth }, idx) => {
              const key       = dateKey(date)
              const dayTasks  = tasksByDay[key] || []
              const isToday   = isSameDay(date, today)
              const isSelected = selectedDay && isSameDay(date, selectedDay)
              // Mobile: show dots only. Desktop: show pills
              const MAX = 3

              return (
                <div
                  key={idx}
                  onClick={() => setSelectedDay(isSelected ? null : date)}
                  className={`border-b border-gray-100 cursor-pointer transition-colors select-none
                    min-h-[52px] sm:min-h-[80px] lg:min-h-[100px]
                    p-1 sm:p-1.5
                    ${isSelected      ? 'bg-primary-50' :
                      isToday         ? 'bg-blue-50/40' :
                      isCurrentMonth  ? 'hover:bg-gray-50' : 'bg-gray-50/60'}`}
                >
                  {/* Day number */}
                  <div className="flex justify-end mb-0.5 sm:mb-1">
                    <span className={`w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center
                      text-[11px] sm:text-xs font-medium rounded-full
                      ${isToday
                        ? 'bg-primary-600 text-white'
                        : isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}`}>
                      {date.getDate()}
                    </span>
                  </div>

                  {/* Mobile: dots only */}
                  {dayTasks.length > 0 && (
                    <div className="flex flex-wrap gap-0.5 sm:hidden justify-center mb-0.5">
                      {dayTasks.slice(0, 4).map(t => (
                        <span key={t.id} className={`w-1.5 h-1.5 rounded-full ${PRIORITY_DOT[t.priority] || 'bg-gray-400'}`} />
                      ))}
                      {dayTasks.length > 4 && (
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                      )}
                    </div>
                  )}

                  {/* sm+: task pills */}
                  <div className="hidden sm:flex flex-col gap-0.5">
                    {dayTasks.slice(0, MAX).map(t => {
                      const colors = TYPE_COLORS[t.type] || TYPE_COLORS.task
                      return (
                        <div
                          key={t.id}
                          onClick={e => { e.stopPropagation(); onTaskSelect?.(t) }}
                          title={t.title}
                          className={`flex items-center gap-1 px-1 sm:px-1.5 py-0.5 rounded text-[10px] sm:text-[11px]
                            font-medium border truncate cursor-pointer hover:opacity-75 transition-opacity
                            ${colors} ${t.status === 'completed' ? 'opacity-40 line-through' : ''}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${PRIORITY_DOT[t.priority] || 'bg-gray-300'}`} />
                          <span className="shrink-0 text-[10px] leading-none">{getTypeEmoji(t.type)}</span>
                          <span className="truncate">{t.title}</span>
                        </div>
                      )
                    })}
                    {dayTasks.length > MAX && (
                      <span className="text-[10px] text-gray-400 font-medium pl-1">
                        +{dayTasks.length - MAX} más
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Day detail panel */}
      {selectedDay && (
        <div className="border-t border-gray-200 bg-white shrink-0 max-h-56 sm:max-h-64 overflow-y-auto">
          <div className="px-3 sm:px-4 lg:px-6 py-2.5 flex items-center justify-between border-b border-gray-100 sticky top-0 bg-white z-10">
            <h3 className="text-sm font-semibold text-gray-900 capitalize">
              {selectedDay.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h3>
            <div className="flex items-center gap-2">
              <button onClick={onNewTask} className="text-xs text-primary-600 hover:text-primary-700 font-medium">
                + Nueva
              </button>
              <button onClick={() => setSelectedDay(null)} className="p-1 rounded hover:bg-gray-100">
                <Icons.close className="w-3.5 h-3.5 text-gray-400" />
              </button>
            </div>
          </div>

          {selectedDayTasks.length === 0 ? (
            <p className="px-3 sm:px-4 lg:px-6 py-4 text-sm text-gray-400">Sin tareas este día.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {selectedDayTasks.map(task => {
                const colors = TYPE_COLORS[task.type] || TYPE_COLORS.task
                return (
                  <div
                    key={task.id}
                    onClick={() => onTaskSelect?.(task)}
                    className="flex items-center gap-3 px-3 sm:px-4 lg:px-6 py-2.5 hover:bg-gray-50 active:bg-gray-100 cursor-pointer"
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center border shrink-0 text-base ${colors}`}>
                      {getTypeEmoji(task.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium text-gray-900 truncate ${
                        task.status === 'completed' ? 'line-through text-gray-400' : ''}`}>
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
                    <Icons.chevronRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />
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
