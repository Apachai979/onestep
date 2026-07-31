"use client"
import { useEffect, useMemo, useRef, useState } from "react"
import { LuCheck, LuChevronDown, LuSearch, LuX } from "react-icons/lu"

// Единая панель фильтров разделов CRM.
//
// Вместо сетки подписанных полей — одна строка компактных «таблеток»:
// поиск слева, фильтры-чипсы следом, действия справа. Неактивный чип
// показывает только название фильтра, активный — «Название: значение»
// и крестик сброса. Так по строке сразу видно, что именно сейчас включено.

const CHIP_BASE =
    "inline-flex h-9 max-w-full items-center gap-1.5 rounded-lg border px-3 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand_main/30"
const CHIP_IDLE =
    "border-line bg-white text-neutral-600 hover:border-neutral-300 hover:text-neutral-900"
const CHIP_ACTIVE = "border-brand_main/40 bg-brand_main/10 text-neutral-900"

const PANEL =
    "absolute left-0 z-30 mt-1.5 max-h-72 min-w-[15rem] max-w-[24rem] overflow-y-auto rounded-xl border border-line bg-white p-1 shadow-lg shadow-neutral-900/10"

// Закрытие по клику вне и по Escape — общая механика всех выпадашек панели.
function useDismiss(open, close) {
    const ref = useRef(null)
    useEffect(() => {
        if (!open) return
        function onDocClick(e) {
            if (ref.current && !ref.current.contains(e.target)) close()
        }
        function onKey(e) {
            if (e.key === "Escape") close()
        }
        document.addEventListener("mousedown", onDocClick)
        document.addEventListener("keydown", onKey)
        return () => {
            document.removeEventListener("mousedown", onDocClick)
            document.removeEventListener("keydown", onKey)
        }
    }, [open, close])
    return ref
}

// Кнопка-чип: слева название фильтра, справа значение (если фильтр активен).
function Chip({ label, value, open, onToggle, onClear, title }) {
    const active = Boolean(value)
    return (
        <span
            className={`${CHIP_BASE} ${active ? CHIP_ACTIVE : CHIP_IDLE} ${
                active ? "pr-1.5" : ""
            } cursor-pointer`}
            title={title || (active ? `${label}: ${value}` : label)}
        >
            <button
                type='button'
                aria-haspopup='listbox'
                aria-expanded={open}
                onClick={onToggle}
                className='flex min-w-0 items-center gap-1.5 focus:outline-none'
            >
                <span className={active ? "shrink-0 text-neutral-500" : "shrink-0"}>
                    {label}
                    {active && ":"}
                </span>
                {active && <span className='truncate font-medium'>{value}</span>}
                {!active && <LuChevronDown className='h-3.5 w-3.5 shrink-0 text-neutral-400' />}
            </button>
            {active && (
                <button
                    type='button'
                    aria-label={`Сбросить фильтр «${label}»`}
                    onClick={onClear}
                    className='ml-0.5 shrink-0 rounded p-0.5 text-neutral-500 transition-colors hover:bg-neutral-900/10 hover:text-neutral-900'
                >
                    <LuX className='h-3.5 w-3.5' />
                </button>
            )}
        </span>
    )
}

function OptionRow({ selected, onSelect, children, multi = false }) {
    return (
        <li
            role='option'
            aria-selected={selected}
            onMouseDown={e => {
                e.preventDefault()
                onSelect()
            }}
            className='flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-neutral-50'
        >
            <span className='min-w-0 flex-1'>{children}</span>
            {multi ? (
                <span
                    aria-hidden='true'
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                        selected
                            ? "border-brand_main bg-brand_main text-white"
                            : "border-neutral-300 bg-white"
                    }`}
                >
                    {selected && <LuCheck className='h-3 w-3' />}
                </span>
            ) : (
                selected && <LuCheck className='h-4 w-4 shrink-0 text-brand_main' />
            )}
        </li>
    )
}

// Строка поиска панели. Крестик очищает поле.
export function FilterSearch({
    value,
    onChange,
    onEnter,
    placeholder = "Поиск",
    className = "",
}) {
    return (
        <div className={`relative min-w-[13rem] flex-1 sm:max-w-sm ${className}`}>
            <LuSearch className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400' />
            <input
                type='search'
                value={value}
                onChange={e => onChange(e.target.value)}
                onKeyDown={e => e.key === "Enter" && onEnter?.()}
                placeholder={placeholder}
                className='h-9 w-full rounded-lg border border-line bg-white pl-9 pr-8 text-sm text-neutral-900 transition-colors placeholder:text-neutral-400 focus:border-brand_main focus:outline-none focus:ring-2 focus:ring-brand_main/20 [&::-webkit-search-cancel-button]:appearance-none'
            />
            {value && (
                <button
                    type='button'
                    aria-label='Очистить поиск'
                    onClick={() => onChange("")}
                    className='absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700'
                >
                    <LuX className='h-3.5 w-3.5' />
                </button>
            )}
        </div>
    )
}

// Одиночный выбор из короткого списка: [{ value, label }].
export function FilterSelect({ label, value, onChange, options, allLabel = "Все" }) {
    const [open, setOpen] = useState(false)
    const ref = useDismiss(open, () => setOpen(false))
    const current = options.find(o => String(o.value) === String(value))

    return (
        <div className='relative' ref={ref}>
            <Chip
                label={label}
                value={current?.label || ""}
                open={open}
                onToggle={() => setOpen(o => !o)}
                onClear={() => {
                    onChange("")
                    setOpen(false)
                }}
            />
            {open && (
                <ul role='listbox' className={PANEL}>
                    <OptionRow
                        selected={!value}
                        onSelect={() => {
                            onChange("")
                            setOpen(false)
                        }}
                    >
                        <span className={value ? "text-neutral-500" : "text-neutral-900"}>
                            {allLabel}
                        </span>
                    </OptionRow>
                    {options.map(o => (
                        <OptionRow
                            key={o.value}
                            selected={String(o.value) === String(value)}
                            onSelect={() => {
                                onChange(o.value)
                                setOpen(false)
                            }}
                        >
                            <span className='block text-neutral-900'>{o.label}</span>
                        </OptionRow>
                    ))}
                </ul>
            )}
        </div>
    )
}

// Множественный выбор: value — массив выбранных `value`, пустой = «Все».
export function FilterMulti({ label, value = [], onChange, options, allLabel = "Все" }) {
    const [open, setOpen] = useState(false)
    const ref = useDismiss(open, () => setOpen(false))

    const selectedLabels = options.filter(o => value.includes(o.value)).map(o => o.label)
    const summary =
        selectedLabels.length === 0
            ? ""
            : selectedLabels.length === 1
              ? selectedLabels[0]
              : `${selectedLabels[0]} +${selectedLabels.length - 1}`

    return (
        <div className='relative' ref={ref}>
            <Chip
                label={label}
                value={summary}
                title={selectedLabels.length ? `${label}: ${selectedLabels.join(", ")}` : label}
                open={open}
                onToggle={() => setOpen(o => !o)}
                onClear={() => onChange([])}
            />
            {open && (
                <ul role='listbox' aria-multiselectable='true' className={PANEL}>
                    <OptionRow selected={value.length === 0} onSelect={() => onChange([])}>
                        <span
                            className={value.length ? "text-neutral-500" : "text-neutral-900"}
                        >
                            {allLabel}
                        </span>
                    </OptionRow>
                    {options.map(o => (
                        <OptionRow
                            key={o.value}
                            multi
                            selected={value.includes(o.value)}
                            onSelect={() =>
                                onChange(
                                    value.includes(o.value)
                                        ? value.filter(v => v !== o.value)
                                        : [...value, o.value],
                                )
                            }
                        >
                            <span className='block text-neutral-900'>{o.label}</span>
                        </OptionRow>
                    ))}
                </ul>
            )}
        </div>
    )
}

// Выбор из длинного справочника (клиенты, сотрудники): [{ id, label, sublabel, search }].
export function FilterPicker({
    label,
    value,
    onChange,
    options,
    searchPlaceholder = "Начните вводить…",
    emptyLabel = "Ничего не найдено",
    maxItems = 30,
}) {
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState("")
    const inputRef = useRef(null)
    const ref = useDismiss(open, () => {
        setOpen(false)
        setQuery("")
    })

    const selected = value ? options.find(o => o.id === value) : null

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase()
        if (!q) return options.slice(0, maxItems)
        return options
            .filter(o => (o.search || o.label || "").toLowerCase().includes(q))
            .slice(0, maxItems)
    }, [options, query, maxItems])

    function openPanel() {
        setQuery("")
        setOpen(true)
        requestAnimationFrame(() => inputRef.current?.focus())
    }

    return (
        <div className='relative' ref={ref}>
            <Chip
                label={label}
                value={selected?.label || ""}
                open={open}
                onToggle={() => (open ? setOpen(false) : openPanel())}
                onClear={() => onChange("")}
            />
            {open && (
                <div className='absolute left-0 z-30 mt-1.5 w-[22rem] max-w-[calc(100vw-2rem)] rounded-xl border border-line bg-white p-1 shadow-lg shadow-neutral-900/10'>
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder={searchPlaceholder}
                        className='mb-1 h-9 w-full rounded-lg border border-line bg-white px-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand_main focus:outline-none focus:ring-2 focus:ring-brand_main/20'
                    />
                    <ul role='listbox' className='max-h-64 overflow-y-auto'>
                        <OptionRow
                            selected={!value}
                            onSelect={() => {
                                onChange("")
                                setOpen(false)
                            }}
                        >
                            <span className={value ? "text-neutral-500" : "text-neutral-900"}>
                                Все
                            </span>
                        </OptionRow>
                        {filtered.length === 0 && (
                            <li className='px-3 py-2 text-sm text-neutral-400'>{emptyLabel}</li>
                        )}
                        {filtered.map(o => (
                            <OptionRow
                                key={o.id}
                                selected={o.id === value}
                                onSelect={() => {
                                    onChange(o.id)
                                    setOpen(false)
                                }}
                            >
                                <span className='block text-neutral-900'>{o.label}</span>
                                {o.sublabel && (
                                    <span className='block text-xs text-neutral-500'>
                                        {o.sublabel}
                                    </span>
                                )}
                            </OptionRow>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    )
}

// Свободный текст в чипе (регион, город): пока пусто — обычный чип,
// после ввода показывает «Регион: Москва».
export function FilterText({ label, value, onChange, placeholder = "" }) {
    const [open, setOpen] = useState(false)
    const [draft, setDraft] = useState(value || "")
    const inputRef = useRef(null)
    const ref = useDismiss(open, () => {
        onChange(draft.trim())
        setOpen(false)
    })

    useEffect(() => {
        setDraft(value || "")
    }, [value])

    function apply() {
        onChange(draft.trim())
        setOpen(false)
    }

    return (
        <div className='relative' ref={ref}>
            <Chip
                label={label}
                value={value || ""}
                open={open}
                onToggle={() => {
                    if (open) {
                        apply()
                        return
                    }
                    setOpen(true)
                    requestAnimationFrame(() => inputRef.current?.focus())
                }}
                onClear={() => {
                    setDraft("")
                    onChange("")
                }}
            />
            {open && (
                <div className='absolute left-0 z-30 mt-1.5 w-[15rem] rounded-xl border border-line bg-white p-1 shadow-lg shadow-neutral-900/10'>
                    <input
                        ref={inputRef}
                        value={draft}
                        onChange={e => setDraft(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === "Enter") apply()
                        }}
                        placeholder={placeholder || label}
                        className='h-9 w-full rounded-lg border border-line bg-white px-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand_main focus:outline-none focus:ring-2 focus:ring-brand_main/20'
                    />
                </div>
            )}
        </div>
    )
}

// Переключатель-таблетка: «Только мои», «Только просроченные».
export function FilterToggle({ label, active, onChange, title }) {
    return (
        <button
            type='button'
            aria-pressed={active}
            title={title || label}
            onClick={() => onChange(!active)}
            className={`${CHIP_BASE} ${active ? CHIP_ACTIVE : CHIP_IDLE} ${
                active ? "font-medium" : ""
            }`}
        >
            {active && <LuCheck className='h-3.5 w-3.5 shrink-0 text-brand_main' />}
            <span className='truncate'>{label}</span>
        </button>
    )
}

// Панель: [поиск] [чипсы] [сбросить] … [действия справа].
export default function FilterBar({ children, actions, onReset, canReset = false }) {
    return (
        <div className='flex flex-wrap items-center gap-2'>
            {children}
            {canReset && onReset && (
                <button
                    type='button'
                    onClick={onReset}
                    className='inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900'
                >
                    <LuX className='h-3.5 w-3.5' />
                    Сбросить
                </button>
            )}
            {actions && <div className='ml-auto flex items-center gap-2'>{actions}</div>}
        </div>
    )
}
