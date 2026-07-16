import { useState, useEffect, useCallback, useMemo } from 'react'
import Icons from '../ui/Icons'
import { getFullName } from '../../lib/utils'
import { useTaskTypes } from '../../lib/SettingsContext'
import { useI18n } from '../../lib/i18n'

// ── helpers ───────────────────────────────────────────────────────────────────

function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

function buildGrid(year, month) {
  const first    = new Date(year, month, 1)
  const startDay = (first.getDay() + 6) % 7
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

// Derive locale-aware names at runtime
function getWeekdayNames(locale, format = 'short') {
  // Mon-first order: start from 2026-01-05 (Monday)
  return Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(locale, { weekday: format }).format(new Date(2026, 0, 5 + i))
  )
}

function getMonthName(locale, year, month) {
  return new Intl.DateTimeFormat(locale, { month: 'long' }).format(new Date(year, month, 1))
}

// ── CalendarView ──────────────────────────────────────────────────────────────

export default function CalendarView({ onNewTask, onTaskSelect }) {
  const today = new Date()
  const { t, locale } = useI18n()
  const taskTypes = useTaskTypes()
  const getTypeEmoji = (typeId) => taskTypes.find(tp => tp.id === typeId)?.emoji || '✅'

  // Locale-aware weekday and month names (memoised — only recompute when locale changes)
  const weekdaysShort = useMemo(() => getWeekdayNames(locale, 'narrow'), [locale])
  const weekdaysLong  = useMemo(() => getWeekdayNames(locale, 'short'),  [locale])

  const [year,        setYear]        = useState(today.getFullYear())
  const [month,       setMonth]       = useState(today.getMonth())
  const [tasks,       setTasks]       = useState([])
  const [loading,     setLoading]     = useState(true)
  // Auto-select today so the panel is always populated on first load
  const [selectedDay, setSelectedDay] = useState(today)

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
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else              setMonth(m => m - 1)
  }
  function nextMonth() {
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
    // On mobile: full-height column — grid gets natural height, panel fills rest
    // On desktop: flex-col with scrollable grid
    <div className="flex-1 flex flex-col bg-white overflow-hidden">

      {/* ── Header ── */}
      <div className="px-3 sm:px-4 lg:px-6 py-2.5 border-b border-gray-200 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 leading-tight capitalize">
            {getMonthName(locale, year, month)} {year}
          </h2>
          <button
            onClick={goToday}
            className="px-2 py-0.5 text-xs font-medium rounded-md border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            {t('common.today')}
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" aria-label={t('tasks.calendar.prevMonth')}>
            <Icons.chevronLeft className="w-4 h-4 text-gray-600" />
          </button>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" aria-label={t('tasks.calendar.nextMonth')}>
            <Icons.chevronRight className="w-4 h-4 text-gray-600" />
          </button>
          <button onClick={onNewTask} className="btn-primary py-1.5 px-2.5 sm:px-3 text-xs sm:text-sm ml-1">
            <Icons.add className="w-4 h-4 sm:mr-1.5" />
            <span className="hidden sm:inline">{t('tasks.newTask')}</span>
          </button>
        </div>
      </div>

      {/* ── Calendar grid — shrink-0 on mobile so it doesn't eat the panel space ── */}
      <div className="shrink-0">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
          {weekdaysShort.map((d, i) => (
            <div key={i} className="py-1.5 text-center">
              <span className="sm:hidden text-[10px] font-semibold text-gray-500 uppercase tracking-wide">{d}</span>
              <span className="hidden sm:inline text-xs font-semibold text-gray-500 uppercase tracking-wide">{weekdaysLong[i]}</span>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48 text-sm text-gray-400">{t('common.loading')}</div>
        ) : (
          <div className="grid grid-cols-7 divide-x divide-gray-100">
            {grid.map(({ date, isCurrentMonth }, idx) => {
              const key        = dateKey(date)
              const dayTasks   = tasksByDay[key] || []
              const isToday    = isSameDay(date, today)
              const isSelected = selectedDay && isSameDay(date, selectedDay)
              const MAX_DESK   = 3
              const MAX_MOB    = 1 // show 1 task name on mobile

              return (
                <div
                  key={idx}
                  onClick={() => setSelectedDay(isSelected ? null : date)}
                  className={`border-b border-gray-100 cursor-pointer transition-colors select-none
                    p-1
                    min-h-[68px] sm:min-h-[88px] lg:min-h-[104px]
                    ${isSelected
                      ? 'bg-primary-50 ring-1 ring-inset ring-primary-200'
                      : isToday
                        ? 'bg-blue-50/50'
                        : isCurrentMonth
                          ? 'hover:bg-gray-50'
                          : 'bg-gray-50/70'}`}
                >
                  {/* Day number */}
                  <div className="flex justify-end mb-1">
                    <span className={`w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center
                      text-[10px] sm:text-xs font-semibold rounded-full leading-none
                      ${isToday
                        ? 'bg-primary-600 text-white'
                        : isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}`}>
                      {date.getDate()}
                    </span>
                  </div>

                  {/* ── Mobile: 1 mini task label + dot overflow ── */}
                  {dayTasks.length > 0 && (
                    <div className="sm:hidden flex flex-col gap-0.5">
                      {/* First task as tiny label */}
                      <div
                        onClick={e => { e.stopPropagation(); onTaskSelect?.(dayTasks[0]) }}
                        className={`flex items-center gap-0.5 px-0.5 py-0.5 rounded text-[9px] font-medium leading-tight
                          border truncate
                          ${TYPE_COLORS[dayTasks[0].type] || TYPE_COLORS.task}
                          ${dayTasks[0].status === 'completed' ? 'opacity-40' : ''}`}
                      >
                        <span className="shrink-0">{getTypeEmoji(dayTasks[0].type)}</span>
                        <span className="truncate">{dayTasks[0].title}</span>
                      </div>
                      {/* Remaining as dots */}
                      {dayTasks.length > 1 && (
                        <div className="flex gap-0.5 pl-0.5 flex-wrap">
                          {dayTasks.slice(1, 4).map(t => (
                            <span key={t.id} className={`w-1.5 h-1.5 rounded-full ${PRIORITY_DOT[t.priority] || 'bg-gray-400'}`} />
                          ))}
                          {dayTasks.length > 4 && (
                            <span className="text-[8px] text-gray-400 font-medium leading-tight">+{dayTasks.length - 4}</span>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── sm+: standard task pills ── */}
                  <div className="hidden sm:flex flex-col gap-0.5">
                    {dayTasks.slice(0, MAX_DESK).map(t => {
                      const colors = TYPE_COLORS[t.type] || TYPE_COLORS.task
                      return (
                        <div
                          key={t.id}
                          onClick={e => { e.stopPropagation(); onTaskSelect?.(t) }}
                          title={t.title}
                          className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px]
                            font-medium border truncate cursor-pointer hover:opacity-75 transition-opacity
                            ${colors} ${t.status === 'completed' ? 'opacity-40 line-through' : ''}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${PRIORITY_DOT[t.priority] || 'bg-gray-300'}`} />
                          <span className="shrink-0 leading-none">{getTypeEmoji(t.type)}</span>
                          <span className="truncate">{t.title}</span>
                        </div>
                      )
                    })}
                    {dayTasks.length > MAX_DESK && (
                      <span className="text-[10px] text-gray-400 font-medium pl-1">
                        {t('tasks.calendar.overflowMore', { count: dayTasks.length - MAX_DESK })}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Day detail panel — flex-1 fills remaining space on mobile ── */}
      <div className={`flex-1 flex flex-col border-t border-gray-200 bg-white overflow-hidden transition-all duration-200
        ${selectedDay ? 'min-h-[140px]' : 'min-h-0'}`}>

        {selectedDay ? (
          <>
            {/* Panel header */}
            <div className="px-3 sm:px-4 lg:px-6 py-2 flex items-center justify-between border-b border-gray-100 shrink-0 bg-white">
              <h3 className="text-sm font-semibold text-gray-900 capitalize">
                {selectedDay.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })}
                  {selectedDayTasks.length > 0 && (
                    <span className="ml-2 text-xs font-normal text-gray-400">
                      {t('tasks.calendar.taskCount', { count: selectedDayTasks.length })}
                    </span>
                  )}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={onNewTask}
                  className="text-xs text-primary-600 hover:text-primary-700 font-medium px-2 py-1 rounded hover:bg-primary-50 transition-colors"
                >
                  {t('tasks.calendar.addNew')}
                </button>
                <button onClick={() => setSelectedDay(null)} className="p-1 rounded hover:bg-gray-100">
                  <Icons.close className="w-3.5 h-3.5 text-gray-400" />
                </button>
              </div>
            </div>

            {/* Task list */}
            <div className="flex-1 overflow-y-auto">
              {selectedDayTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-6 px-4 text-center">
                  <span className="text-2xl mb-2">📭</span>
                  <p className="text-sm text-gray-400">{t('tasks.calendar.noTasksDay')}</p>
                  <button
                    onClick={onNewTask}
                    className="mt-3 text-xs text-primary-600 hover:text-primary-700 font-medium"
                  >
                    {t('tasks.calendar.addTaskDay')}
                  </button>
                </div>
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
                        {/* Type badge */}
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 text-base ${colors}`}>
                          {getTypeEmoji(task.type)}
                        </div>

                        {/* Title + contact */}
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium text-gray-900 truncate leading-snug ${
                            task.status === 'completed' ? 'line-through text-gray-400' : ''}`}>
                            {task.title}
                          </p>
                          {(task.contact || task.deal) && (
                            <p className="text-xs text-gray-500 truncate mt-0.5">
                              {task.contact
                                ? getFullName(task.contact.firstName, task.contact.lastName)
                                : task.deal?.title}
                            </p>
                          )}
                        </div>

                        {/* Priority + chevron */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`w-2 h-2 rounded-full ${PRIORITY_DOT[task.priority] || 'bg-gray-300'}`} />
                          <Icons.chevronRight className="w-3.5 h-3.5 text-gray-300" />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        ) : (
          /* No day selected — subtle prompt */
          <div className="flex-1 flex items-center justify-center py-4">
            <p className="text-xs text-gray-300 font-medium">{t('tasks.calendar.tapToSeeDay')}</p>
          </div>
        )}
      </div>
    </div>
  )
}
