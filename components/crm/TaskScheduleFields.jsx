"use client"
import { TASK_DUE_PRESETS, taskDuePresetYmd } from "@/lib/crm/task"
import {
    addDaysYmd,
    crmHm,
    crmParseDateTime,
    crmToday,
    crmYmd,
    daysBetweenYmd,
    formatCrmDate,
} from "@/lib/crm/datetime"

// Поля срока задачи — одна реализация на форму создания и на карточку задачи.
// Обычной задаче нужен один срок («сделать до»), поэтому время и период живут
// за переключателем.

const FIELD_CLASS =
    "w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm transition-all duration-200 placeholder:text-neutral-400 focus:border-brand_main focus:outline-none focus:ring-2 focus:ring-brand_main/20"
const LABEL_CLASS = "mb-1.5 block text-xs font-medium text-neutral-500"

const DEFAULT_START_TIME = "09:00"

export function dateOnly(v) {
    if (!v) return ""
    return String(v).slice(0, 10)
}

export function timeOnly(v) {
    if (!v) return ""
    const s = String(v)
    if (s.length >= 16 && s.includes("T")) return s.slice(11, 16)
    return ""
}

export function composeDateTime(date, time) {
    if (!date) return ""
    return `${date}T${time || "00:00"}`
}

/** Срок по умолчанию для новой задачи: сегодня, весь день. */
export function defaultSchedule(date = crmToday()) {
    return { allDay: true, startAt: date, endAt: date }
}

/** Срок сохранённой задачи → значения полей. */
export function scheduleFromTask(task) {
    const asInput = value =>
        task.allDay ? crmYmd(value) : `${crmYmd(value)}T${crmHm(value)}`
    return {
        allDay: !!task.allDay,
        startAt: asInput(task.startAt),
        endAt: asInput(task.endAt),
    }
}

/** Такой срок одним полем не показать — нужен расширенный режим. */
export function needsAdvanced(schedule) {
    if (!schedule) return false
    if (!schedule.allDay) return true
    return dateOnly(schedule.startAt) !== dateOnly(schedule.endAt)
}

function toInput(date) {
    return `${crmYmd(date)}T${crmHm(date)}`
}

/** Длительность задачи со временем, мс. */
function durationMs(startInput, endInput) {
    const s = crmParseDateTime(startInput)
    const e = crmParseDateTime(endInput)
    if (!s || !e) return null
    return Math.max(e.getTime() - s.getTime(), 0)
}

// --- Переходы срока (чистые, чтобы их можно было проверить) --------------

/** Простой срок: один день, весь день. */
export function collapseToDue(value) {
    const due = dateOnly(value.endAt) || dateOnly(value.startAt) || crmToday()
    return { allDay: true, startAt: due, endAt: due }
}

/** Расширенный режим: период по умолчанию — сутки от начала. */
export function expandToPeriod(value) {
    const day = dateOnly(value.startAt) || dateOnly(value.endAt) || crmToday()
    return {
        allDay: false,
        startAt: composeDateTime(day, DEFAULT_START_TIME),
        endAt: composeDateTime(addDaysYmd(day, 1), DEFAULT_START_TIME),
    }
}

export function setAllDay(value, allDay) {
    if (!allDay) return expandToPeriod(value)
    const start = dateOnly(value.startAt) || crmToday()
    return {
        allDay: true,
        startAt: start,
        endAt: dateOnly(value.endAt) || start,
    }
}

/**
 * Сдвиг начала тянет за собой окончание: выбранная длительность сохраняется —
 * сутки по умолчанию, час у встречи.
 */
export function shiftStart(value, nextStart) {
    const duration = durationMs(value.startAt, value.endAt)
    const start = crmParseDateTime(nextStart)
    const endAt =
        start && duration != null
            ? toInput(new Date(start.getTime() + duration))
            : value.endAt
    return { ...value, startAt: nextStart, endAt }
}

/** В периоде из целых дней сохраняется число дней. */
export function shiftAllDayStart(value, nextStart) {
    if (!nextStart) return value
    const days = daysBetweenYmd(dateOnly(value.startAt), dateOnly(value.endAt))
    return {
        ...value,
        startAt: nextStart,
        endAt: days != null && days > 0 ? addDaysYmd(nextStart, days) : nextStart,
    }
}

export default function TaskScheduleFields({
    value,
    onChange,
    advanced,
    onAdvancedChange,
    // Брейкпоинты Tailwind смотрят на ширину экрана, а не контейнера, поэтому
    // в узких местах (карточка задачи, форма в боковой панели) две колонки
    // раскладываем вертикально явным флагом.
    dense = false,
}) {
    const dueDate = dateOnly(value.endAt)
    const groupsClass = dense ? "grid gap-3" : "grid gap-3 sm:grid-cols-2"

    function setDue(date) {
        if (!date) return
        onChange({ allDay: true, startAt: date, endAt: date })
    }

    function toggleAdvanced() {
        onChange(advanced ? collapseToDue(value) : expandToPeriod(value))
        onAdvancedChange(!advanced)
    }

    function setTimedStart(next) {
        onChange(shiftStart(value, next))
    }

    function setAllDayStart(next) {
        onChange(shiftAllDayStart(value, next))
    }

    return (
        <div className='space-y-2'>
            <div className='flex items-center justify-between gap-2'>
                <span className='text-xs font-medium text-neutral-500'>Срок *</span>
                <button
                    type='button'
                    onClick={toggleAdvanced}
                    className='text-xs text-brand_main hover:underline'
                >
                    {advanced ? "Простой срок" : "Время и период"}
                </button>
            </div>

            {!advanced ? (
                <div>
                    <input
                        type='date'
                        value={dueDate}
                        onChange={e => setDue(e.target.value)}
                        required
                        className={FIELD_CLASS}
                    />
                    <div className='mt-2 flex flex-wrap gap-1.5'>
                        {TASK_DUE_PRESETS.map(preset => {
                            const presetValue = taskDuePresetYmd(preset.days)
                            const active = dueDate === presetValue
                            return (
                                <button
                                    key={preset.label}
                                    type='button'
                                    onClick={() => setDue(presetValue)}
                                    className={`rounded-lg border px-2 py-1 text-xs transition-colors ${
                                        active
                                            ? "border-brand_main bg-brand_main/10 text-brand_main"
                                            : "border-line text-neutral-600 hover:bg-surface_muted"
                                    }`}
                                >
                                    {preset.label}
                                </button>
                            )
                        })}
                    </div>
                    <p className='mt-1.5 text-xs text-neutral-400'>
                        До конца дня {formatCrmDate(dueDate)} по московскому времени
                    </p>
                </div>
            ) : (
                <>
                    <label className='flex items-center gap-2 text-sm text-neutral-700'>
                        <input
                            type='checkbox'
                            checked={value.allDay}
                            onChange={e => onChange(setAllDay(value, e.target.checked))}
                            className='h-4 w-4 rounded border-line text-brand_main focus:ring-brand_main/30'
                        />
                        Весь день
                    </label>
                    {value.allDay ? (
                        <div className={groupsClass}>
                            <div>
                                <label className={LABEL_CLASS}>Дата начала</label>
                                <input
                                    type='date'
                                    value={dateOnly(value.startAt)}
                                    onChange={e => setAllDayStart(e.target.value)}
                                    required
                                    className={FIELD_CLASS}
                                />
                            </div>
                            <div>
                                <label className={LABEL_CLASS}>Дата окончания</label>
                                <input
                                    type='date'
                                    value={dueDate}
                                    onChange={e =>
                                        onChange({ ...value, endAt: e.target.value })
                                    }
                                    required
                                    className={FIELD_CLASS}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className={groupsClass}>
                            <div>
                                <label className={LABEL_CLASS}>Начало</label>
                                <div className='grid grid-cols-[minmax(0,1fr)_7.5rem] gap-2'>
                                    <input
                                        type='date'
                                        value={dateOnly(value.startAt)}
                                        onChange={e =>
                                            setTimedStart(
                                                composeDateTime(
                                                    e.target.value,
                                                    timeOnly(value.startAt) ||
                                                        DEFAULT_START_TIME,
                                                ),
                                            )
                                        }
                                        required
                                        className={`${FIELD_CLASS} min-w-0`}
                                    />
                                    <input
                                        type='time'
                                        value={timeOnly(value.startAt)}
                                        onChange={e =>
                                            setTimedStart(
                                                composeDateTime(
                                                    dateOnly(value.startAt),
                                                    e.target.value,
                                                ),
                                            )
                                        }
                                        required
                                        className={`${FIELD_CLASS} min-w-0`}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className={LABEL_CLASS}>Окончание</label>
                                <div className='grid grid-cols-[minmax(0,1fr)_7.5rem] gap-2'>
                                    <input
                                        type='date'
                                        value={dueDate}
                                        onChange={e =>
                                            onChange({
                                                ...value,
                                                endAt: composeDateTime(
                                                    e.target.value,
                                                    timeOnly(value.endAt) ||
                                                        DEFAULT_START_TIME,
                                                ),
                                            })
                                        }
                                        required
                                        className={`${FIELD_CLASS} min-w-0`}
                                    />
                                    <input
                                        type='time'
                                        value={timeOnly(value.endAt)}
                                        onChange={e =>
                                            onChange({
                                                ...value,
                                                endAt: composeDateTime(
                                                    dueDate,
                                                    e.target.value,
                                                ),
                                            })
                                        }
                                        required
                                        className={`${FIELD_CLASS} min-w-0`}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
