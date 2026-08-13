"use client"
import { LuCalendarRange } from "react-icons/lu"
import { crmToday } from "@/lib/crm/datetime"
import { detectPeriodPreset, PERIOD_PRESETS, periodPreset } from "@/lib/crm/period"

// Выбор отчётного периода: пресеты одной сегментированной кнопкой + ручной
// ввод дат. Общий для раздела аналитики — новые отчёты берут его как есть.
//
// Значение — пара "YYYY-MM-DD" в зоне CRM, ровно в том виде, в каком его ждут
// API и input[type=date]. Активный пресет не хранится отдельным состоянием, а
// вычисляется из дат: тогда «прошлый год», выбранный руками, подсветится сам,
// а ссылкой на отчёт можно поделиться.
export default function PeriodFilter({ value, onChange, disabled = false }) {
    const today = crmToday()
    const active = detectPeriodPreset(value, today)

    function setPreset(key) {
        onChange(periodPreset(key, today))
    }

    // Перевёрнутый диапазон правим на месте, а не блокируем ввод: менеджер
    // часто сначала меняет «по», а потом «с», и подсказка об ошибке тут только
    // мешала бы.
    function setFrom(from) {
        onChange({ from, to: value.to && from > value.to ? from : value.to })
    }

    function setTo(to) {
        onChange({ from: value.from && to < value.from ? to : value.from, to })
    }

    return (
        <div className='flex flex-wrap items-center gap-2'>
            <div className='inline-flex h-9 items-center rounded-lg border border-line bg-white p-0.5'>
                {PERIOD_PRESETS.map(p => (
                    <button
                        key={p.key}
                        type='button'
                        disabled={disabled}
                        aria-pressed={active === p.key}
                        onClick={() => setPreset(p.key)}
                        className={`h-8 rounded-md px-2.5 text-sm transition-colors disabled:opacity-50 ${
                            active === p.key
                                ? "bg-brand_main/10 font-medium text-neutral-900"
                                : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
                        }`}
                    >
                        {p.label}
                    </button>
                ))}
            </div>

            <div
                className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-sm ${
                    active ? "border-line bg-white" : "border-brand_main/40 bg-brand_main/10"
                }`}
            >
                <LuCalendarRange className='h-4 w-4 shrink-0 text-neutral-400' />
                <input
                    type='date'
                    value={value.from || ""}
                    max={value.to || undefined}
                    disabled={disabled}
                    onChange={e => setFrom(e.target.value)}
                    aria-label='Начало периода'
                    className='w-[7.5rem] bg-transparent text-sm text-neutral-900 focus:outline-none disabled:opacity-50'
                />
                <span className='text-neutral-400'>—</span>
                <input
                    type='date'
                    value={value.to || ""}
                    min={value.from || undefined}
                    disabled={disabled}
                    onChange={e => setTo(e.target.value)}
                    aria-label='Конец периода'
                    className='w-[7.5rem] bg-transparent text-sm text-neutral-900 focus:outline-none disabled:opacity-50'
                />
            </div>
        </div>
    )
}
