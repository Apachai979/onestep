"use client"
import { useEffect, useMemo, useState } from "react"
import { TASK_TYPE_MAP } from "@/lib/crm/task"
import TaskTypeIcon from "./TaskTypeIcon"
import TaskCloseModal from "./TaskCloseModal"

function safeJson(text) {
    try {
        return JSON.parse(text)
    } catch {
        return null
    }
}

function startOfWeek(d) {
    const x = new Date(d)
    x.setHours(0, 0, 0, 0)
    const day = x.getDay()
    const diff = day === 0 ? -6 : 1 - day
    x.setDate(x.getDate() + diff)
    return x
}

function startOfMonth(d) {
    const x = new Date(d.getFullYear(), d.getMonth(), 1)
    x.setHours(0, 0, 0, 0)
    return x
}

function startOfDay(d) {
    const x = new Date(d)
    x.setHours(0, 0, 0, 0)
    return x
}

function addDays(d, n) {
    const x = new Date(d)
    x.setDate(x.getDate() + n)
    return x
}

function ymd(d) {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, "0")
    const day = String(d.getDate()).padStart(2, "0")
    return `${y}-${m}-${day}`
}

const MONTHS = [
    "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
    "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
]

const DOW_SHORT = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]

const HOUR_START = 7
const HOUR_END = 22
const HOUR_HEIGHT = 48

function isSameDay(a, b) {
    return (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    )
}

function fullName(u) {
    if (!u) return ""
    return `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email
}

export default function TaskCalendar({ currentUserId, currentUserRole, onCreateAt }) {
    const [view, setView] = useState("month")
    const [cursor, setCursor] = useState(() => {
        const d = new Date()
        d.setHours(0, 0, 0, 0)
        return d
    })
    const [items, setItems] = useState([])
    const [error, setError] = useState("")
    const [closing, setClosing] = useState(null)

    const range = useMemo(() => {
        if (view === "day") return { start: startOfDay(cursor), end: addDays(startOfDay(cursor), 1) }
        if (view === "week") {
            const start = startOfWeek(cursor)
            return { start, end: addDays(start, 7) }
        }
        const monthStart = startOfMonth(cursor)
        const gridStart = startOfWeek(monthStart)
        return { start: gridStart, end: addDays(gridStart, 42) }
    }, [view, cursor])

    async function load() {
        const params = new URLSearchParams()
        params.set("from", ymd(range.start))
        params.set("to", ymd(addDays(range.end, -1)))
        const r = await fetch(`/api/crm/tasks?${params.toString()}`)
        const text = await r.text()
        const data = text ? safeJson(text) : {}
        if (!r.ok) {
            setError(data?.error || `Ошибка ${r.status}`)
            setItems([])
            return
        }
        setError("")
        setItems(data.items || [])
    }

    useEffect(() => {
        load()
    }, [range.start.getTime(), range.end.getTime()])

    const tasksByDay = useMemo(() => {
        const map = new Map()
        for (const t of items) {
            const s = new Date(t.startAt)
            const e = new Date(t.endAt)
            let start, end
            if (t.allDay) {
                start = new Date(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate())
                end = new Date(e.getUTCFullYear(), e.getUTCMonth(), e.getUTCDate())
            } else {
                start = new Date(s.getFullYear(), s.getMonth(), s.getDate())
                end = new Date(e.getFullYear(), e.getMonth(), e.getDate())
            }
            for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
                const key = ymd(d)
                if (!map.has(key)) map.set(key, [])
                map.get(key).push(t)
            }
        }
        return map
    }, [items])

    function shift(delta) {
        setCursor(prev => {
            const d = new Date(prev)
            if (view === "day") d.setDate(d.getDate() + delta)
            else if (view === "week") d.setDate(d.getDate() + delta * 7)
            else d.setMonth(d.getMonth() + delta)
            return d
        })
    }

    function goToday() {
        const d = new Date()
        d.setHours(0, 0, 0, 0)
        setCursor(d)
    }

    function canClose(t) {
        if (currentUserRole === "ADMIN") return true
        return t.assigneeId === currentUserId || t.createdById === currentUserId
    }

    const headerLabel =
        view === "day"
            ? cursor.toLocaleDateString("ru-RU", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
              })
            : view === "week"
              ? `${range.start.toLocaleDateString("ru-RU")} — ${addDays(range.end, -1).toLocaleDateString("ru-RU")}`
              : `${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`

    return (
        <div className='space-y-3'>
            <div className='flex flex-wrap items-center justify-between gap-3'>
                <div className='flex items-center gap-2'>
                    <button
                        type='button'
                        onClick={() => shift(-1)}
                        className='rounded-md border border-gray-300 px-2 py-1 text-sm hover:bg-gray-100'
                    >
                        ←
                    </button>
                    <button
                        type='button'
                        onClick={goToday}
                        className='rounded-md border border-gray-300 px-3 py-1 text-sm hover:bg-gray-100'
                    >
                        Сегодня
                    </button>
                    <button
                        type='button'
                        onClick={() => shift(1)}
                        className='rounded-md border border-gray-300 px-2 py-1 text-sm hover:bg-gray-100'
                    >
                        →
                    </button>
                    <span className='ml-2 text-sm font-medium text-night_green'>
                        {headerLabel}
                    </span>
                </div>
                <div className='flex gap-1'>
                    {[
                        ["day", "День"],
                        ["week", "Неделя"],
                        ["month", "Месяц"],
                    ].map(([v, label]) => (
                        <button
                            key={v}
                            type='button'
                            onClick={() => setView(v)}
                            className={`rounded-md px-3 py-1 text-sm ${
                                view === v
                                    ? "bg-primary_green text-white"
                                    : "border border-gray-300 text-gray-700 hover:bg-gray-100"
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {error && <p className='text-sm text-red-600'>{error}</p>}

            {view === "month" && (
                <MonthGrid
                    range={range}
                    cursor={cursor}
                    items={items}
                    onPick={setClosing}
                    canClose={canClose}
                    onCreateAt={onCreateAt}
                />
            )}
            {view === "week" && (
                <HoursGrid
                    days={Array.from({ length: 7 }, (_, i) => addDays(range.start, i))}
                    items={items}
                    tasksByDay={tasksByDay}
                    onPick={setClosing}
                    canClose={canClose}
                    onCreateAt={onCreateAt}
                />
            )}
            {view === "day" && (
                <HoursGrid
                    days={[cursor]}
                    items={items}
                    tasksByDay={tasksByDay}
                    onPick={setClosing}
                    canClose={canClose}
                    onCreateAt={onCreateAt}
                />
            )}

            {closing && (
                <TaskCloseModal
                    task={closing}
                    onClose={() => setClosing(null)}
                    onClosed={() => {
                        setClosing(null)
                        load()
                    }}
                />
            )}
        </div>
    )
}

const LANE_HEIGHT = 22
const LANE_GAP = 2
const MIN_LANES_AREA = 1
const MONTH_HEADER_H = 28

function taskDayRange(t) {
    const s = new Date(t.startAt)
    const e = new Date(t.endAt)
    if (t.allDay) {
        return {
            start: new Date(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate()),
            end: new Date(e.getUTCFullYear(), e.getUTCMonth(), e.getUTCDate()),
        }
    }
    return {
        start: new Date(s.getFullYear(), s.getMonth(), s.getDate()),
        end: new Date(e.getFullYear(), e.getMonth(), e.getDate()),
    }
}

function daysBetween(a, b) {
    return Math.round((b.getTime() - a.getTime()) / 86_400_000)
}

function layoutSegments(items, rangeStart, colCount, predicate = null) {
    const rangeEnd = addDays(rangeStart, colCount - 1)
    const segments = []
    for (const t of items) {
        if (predicate && !predicate(t)) continue
        const { start, end } = taskDayRange(t)
        if (end < rangeStart || start > rangeEnd) continue
        const startCol = Math.max(0, daysBetween(rangeStart, start))
        const endCol = Math.min(colCount - 1, daysBetween(rangeStart, end))
        segments.push({ task: t, startCol, endCol, lane: -1 })
    }
    segments.sort(
        (a, b) =>
            a.startCol - b.startCol || b.endCol - b.startCol - (a.endCol - a.startCol),
    )
    const lanes = []
    for (const seg of segments) {
        let lane = 0
        while (
            lanes[lane]?.some(
                ex => !(ex.endCol < seg.startCol || ex.startCol > seg.endCol),
            )
        ) {
            lane++
        }
        if (!lanes[lane]) lanes[lane] = []
        lanes[lane].push(seg)
        seg.lane = lane
    }
    return segments
}

function MonthGrid({ range, cursor, items, onPick, canClose, onCreateAt }) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const weeks = []
    for (let w = 0; w < 6; w++) {
        const days = []
        for (let d = 0; d < 7; d++) days.push(addDays(range.start, w * 7 + d))
        weeks.push(days)
    }

    return (
        <div className='overflow-hidden rounded-xl border border-gray-200 bg-white'>
            <div className='grid grid-cols-7 border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500'>
                {DOW_SHORT.map(d => (
                    <div key={d} className='px-2 py-2 text-center'>
                        {d}
                    </div>
                ))}
            </div>

            {weeks.map((days, wi) => {
                const weekStart = days[0]
                const segments = layoutSegments(items, weekStart, 7)
                const usedLanes = segments.reduce(
                    (m, s) => Math.max(m, s.lane + 1),
                    0,
                )
                const eventsAreaHeight =
                    Math.max(MIN_LANES_AREA, usedLanes) * (LANE_HEIGHT + LANE_GAP) + 4

                return (
                    <div
                        key={wi}
                        className='relative border-b border-gray-100 last:border-b-0'
                    >
                        <div className='grid grid-cols-7'>
                            {days.map((d, di) => {
                                const inMonth = d.getMonth() === cursor.getMonth()
                                const isToday = isSameDay(d, today)
                                return (
                                    <div
                                        key={di}
                                        onClick={() => onCreateAt?.({ date: ymd(d) })}
                                        style={{
                                            height: MONTH_HEADER_H + eventsAreaHeight,
                                        }}
                                        className={`group cursor-pointer border-r border-gray-100 text-xs last:border-r-0 ${
                                            inMonth
                                                ? "bg-white hover:bg-gray-50"
                                                : "bg-gray-50 text-gray-400"
                                        }`}
                                    >
                                        <div className='flex items-center justify-between px-1.5 pt-1'>
                                            <div
                                                className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${
                                                    isToday
                                                        ? "bg-primary_green font-semibold text-white"
                                                        : ""
                                                }`}
                                            >
                                                {d.getDate()}
                                            </div>
                                            <span className='hidden text-[10px] text-primary_green group-hover:inline'>
                                                + задача
                                            </span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        <div
                            className='pointer-events-none absolute inset-x-0'
                            style={{ top: MONTH_HEADER_H, height: eventsAreaHeight }}
                        >
                            {segments.map(seg => (
                                <SpanningTask
                                    key={seg.task.id}
                                    seg={seg}
                                    colCount={7}
                                    onClick={e => {
                                        e.stopPropagation()
                                        if (canClose(seg.task)) onPick(seg.task)
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

function SpanningTask({ seg, colCount, onClick }) {
    const { task, startCol, endCol, lane } = seg
    const meta = TASK_TYPE_MAP[task.type]
    const closed = task.status !== "OPEN"
    return (
        <button
            type='button'
            onClick={onClick}
            style={{
                top: lane * (LANE_HEIGHT + LANE_GAP) + 2,
                left: `calc(${startCol} * (100% / ${colCount}) + 2px)`,
                width: `calc(${endCol - startCol + 1} * (100% / ${colCount}) - 4px)`,
                height: LANE_HEIGHT,
            }}
            className={`pointer-events-auto absolute flex items-center gap-1 overflow-hidden rounded border border-l-4 px-1.5 text-[11px] ${meta?.bg || "bg-gray-100"} ${meta?.border || "border-gray-400"} ${
                closed ? "opacity-50 line-through" : "hover:brightness-95"
            }`}
        >
            <TaskTypeIcon type={task.type} />
            <span className='truncate font-medium'>{task.title}</span>
        </button>
    )
}

function HoursGrid({ days, items, tasksByDay, onPick, canClose, onCreateAt }) {
    const hours = []
    for (let h = HOUR_START; h <= HOUR_END; h++) hours.push(h)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const totalHeight = (HOUR_END - HOUR_START + 1) * HOUR_HEIGHT

    const allDaySegments = layoutSegments(items || [], days[0], days.length, t => t.allDay)
    const allDayLanes = allDaySegments.reduce((m, s) => Math.max(m, s.lane + 1), 0)
    const allDayHeight =
        Math.max(MIN_LANES_AREA, allDayLanes) * (LANE_HEIGHT + LANE_GAP) + 4

    return (
        <div className='overflow-x-auto rounded-xl border border-gray-200 bg-white'>
            <div className='min-w-[640px]'>
                {/* Шапка с датами */}
                <div
                    className='grid border-b border-gray-200'
                    style={{ gridTemplateColumns: `60px repeat(${days.length}, minmax(0,1fr))` }}
                >
                    <div className='bg-gray-50' />
                    {days.map((d, i) => {
                        const isToday = isSameDay(d, today)
                        return (
                            <div
                                key={i}
                                className={`border-l border-gray-200 px-2 py-2 text-center ${
                                    isToday ? "bg-primary_green/10" : "bg-gray-50"
                                }`}
                            >
                                <div className='text-xs uppercase text-gray-500'>
                                    {DOW_SHORT[(d.getDay() + 6) % 7]}
                                </div>
                                <div className='text-sm font-semibold text-night_green'>
                                    {d.getDate()}.{String(d.getMonth() + 1).padStart(2, "0")}
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Полоса all-day */}
                <div
                    className='grid border-b border-gray-200 bg-amber-50/30'
                    style={{ gridTemplateColumns: `60px 1fr` }}
                >
                    <div className='px-2 py-1 text-right text-[10px] uppercase text-gray-500'>
                        Весь день
                    </div>
                    <div className='relative' style={{ height: allDayHeight }}>
                        {/* Клик-зоны для создания по дню */}
                        <div
                            className='absolute inset-0 grid'
                            style={{
                                gridTemplateColumns: `repeat(${days.length}, minmax(0,1fr))`,
                            }}
                        >
                            {days.map((d, i) => (
                                <div
                                    key={i}
                                    onClick={() => onCreateAt?.({ date: ymd(d) })}
                                    className='cursor-pointer border-l border-gray-200 hover:bg-amber-50'
                                />
                            ))}
                        </div>
                        {/* Spanning bars */}
                        {allDaySegments.map(seg => (
                            <SpanningTask
                                key={seg.task.id}
                                seg={seg}
                                colCount={days.length}
                                onClick={e => {
                                    e.stopPropagation()
                                    if (canClose(seg.task)) onPick(seg.task)
                                }}
                            />
                        ))}
                    </div>
                </div>

                {/* Часовая сетка */}
                <div
                    className='grid'
                    style={{ gridTemplateColumns: `60px repeat(${days.length}, minmax(0,1fr))` }}
                >
                    {/* Колонка часов */}
                    <div>
                        {hours.map(h => (
                            <div
                                key={h}
                                style={{ height: HOUR_HEIGHT }}
                                className='border-b border-gray-100 pr-2 text-right text-[10px] text-gray-500'
                            >
                                {String(h).padStart(2, "0")}:00
                            </div>
                        ))}
                    </div>

                    {days.map((d, dayIdx) => {
                        const list = (tasksByDay.get(ymd(d)) || []).filter(t => !t.allDay)
                        return (
                            <div
                                key={dayIdx}
                                className='relative border-l border-gray-200'
                                style={{ height: totalHeight }}
                            >
                                {hours.map((h, idx) => (
                                    <div
                                        key={h}
                                        onClick={() => onCreateAt?.({ date: ymd(d), hour: h })}
                                        className='cursor-pointer border-b border-gray-100 hover:bg-gray-50'
                                        style={{ height: HOUR_HEIGHT }}
                                        title={`Создать задачу в ${String(h).padStart(2, "0")}:00`}
                                    />
                                ))}
                                {list.map(t => {
                                    const pos = positionTimed(t, d)
                                    if (!pos) return null
                                    return (
                                        <TimedTask
                                            key={t.id}
                                            task={t}
                                            pos={pos}
                                            onClick={e => {
                                                e.stopPropagation()
                                                if (canClose(t)) onPick(t)
                                            }}
                                        />
                                    )
                                })}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

function positionTimed(task, day) {
    const dayStart = startOfDay(day).getTime()
    const dayEnd = addDays(day, 1).getTime() - 1
    const taskStart = new Date(task.startAt).getTime()
    const taskEnd = new Date(task.endAt).getTime()

    const visibleStart = Math.max(taskStart, dayStart)
    const visibleEnd = Math.min(taskEnd, dayEnd)
    if (visibleEnd < visibleStart) return null

    const startMinutes = (visibleStart - dayStart) / 60_000 - HOUR_START * 60
    const endMinutes = (visibleEnd - dayStart) / 60_000 - HOUR_START * 60
    const maxMinutes = (HOUR_END - HOUR_START + 1) * 60

    const clampedStart = Math.max(0, startMinutes)
    const clampedEnd = Math.min(maxMinutes, endMinutes)
    if (clampedEnd <= clampedStart) return null

    const top = (clampedStart / 60) * HOUR_HEIGHT
    const height = Math.max(((clampedEnd - clampedStart) / 60) * HOUR_HEIGHT, 18)
    return { top, height }
}

function TimedTask({ task, pos, onClick }) {
    const meta = TASK_TYPE_MAP[task.type]
    const closed = task.status !== "OPEN"
    const start = new Date(task.startAt)
    const end = new Date(task.endAt)
    const timeStr = `${start.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}–${end.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`
    return (
        <button
            type='button'
            onClick={onClick}
            style={{ top: pos.top, height: pos.height }}
            className={`absolute left-0.5 right-0.5 overflow-hidden rounded border border-l-4 px-1.5 py-1 text-left text-[11px] shadow-sm ${meta?.bg || "bg-gray-100"} ${meta?.border || "border-gray-400"} ${
                closed ? "opacity-50 line-through" : "hover:brightness-95"
            }`}
        >
            <div className='flex items-center gap-1 font-medium'>
                <TaskTypeIcon type={task.type} />
                <span className='truncate'>{task.title}</span>
            </div>
            <div className='mt-0.5 text-[10px] opacity-80'>
                {timeStr} · {fullName(task.assignee)}
            </div>
        </button>
    )
}

function TaskChip({ task, onClick, detailed = false }) {
    const meta = TASK_TYPE_MAP[task.type]
    const time = task.allDay
        ? "Весь день"
        : new Date(task.startAt).toLocaleTimeString("ru-RU", {
              hour: "2-digit",
              minute: "2-digit",
          })
    const closed = task.status !== "OPEN"
    return (
        <button
            type='button'
            onClick={onClick}
            className={`block w-full rounded border border-l-4 px-2 py-1 text-left ${meta?.bg || "bg-gray-100"} ${meta?.border || "border-gray-400"} ${
                closed ? "opacity-50 line-through" : "hover:brightness-95"
            }`}
        >
            <div className='flex items-center gap-1'>
                <TaskTypeIcon type={task.type} />
                <span className='truncate text-[11px] font-medium'>{task.title}</span>
            </div>
            {detailed && (
                <div className='mt-0.5 text-[10px] opacity-80'>
                    {time} · {fullName(task.assignee)}
                </div>
            )}
        </button>
    )
}
