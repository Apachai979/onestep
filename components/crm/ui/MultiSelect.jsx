"use client"
import { useEffect, useId, useRef, useState } from "react"
import { LuCheck, LuChevronDown } from "react-icons/lu"
import Field from "./Field"

// Выпадающий список с множественным выбором: галочка справа от каждого пункта.
// Значение — массив выбранных `value`; пустой массив означает «Все».
export default function MultiSelect({
    label,
    hint,
    error,
    value = [],
    onChange,
    options = [],
    placeholder = "Все",
    allLabel = "Все",
    disabled = false,
    containerClassName = "",
}) {
    const [open, setOpen] = useState(false)
    const containerRef = useRef(null)
    const buttonId = useId()

    useEffect(() => {
        if (!open) return
        function onDocClick(e) {
            if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false)
        }
        function onKey(e) {
            if (e.key === "Escape") setOpen(false)
        }
        document.addEventListener("mousedown", onDocClick)
        document.addEventListener("keydown", onKey)
        return () => {
            document.removeEventListener("mousedown", onDocClick)
            document.removeEventListener("keydown", onKey)
        }
    }, [open])

    function toggle(v) {
        onChange(value.includes(v) ? value.filter(x => x !== v) : [...value, v])
    }

    const selectedLabels = options.filter(o => value.includes(o.value)).map(o => o.label)
    const summary =
        selectedLabels.length === 0
            ? placeholder
            : selectedLabels.length === 1
              ? selectedLabels[0]
              : `${selectedLabels[0]} +${selectedLabels.length - 1}`

    const hasError = Boolean(error)
    const borderCls = hasError
        ? "border-red-300 focus:border-red-400 focus:ring-red-500/15"
        : "border-line focus:border-brand_main focus:ring-brand_main/20"

    const control = (
        <div className='relative' ref={containerRef}>
            <button
                type='button'
                id={buttonId}
                disabled={disabled}
                aria-haspopup='listbox'
                aria-expanded={open}
                onClick={() => !disabled && setOpen(o => !o)}
                className={`flex h-10 w-full items-center justify-between gap-2 rounded-xl border bg-white pl-3 pr-3 text-left text-sm shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 disabled:bg-surface_muted disabled:text-neutral-400 ${borderCls}`}
            >
                <span
                    className={`truncate ${
                        selectedLabels.length ? "text-neutral-900" : "text-neutral-400"
                    }`}
                >
                    {summary}
                </span>
                <LuChevronDown className='h-4 w-4 shrink-0 text-neutral-400' />
            </button>

            {open && (
                <ul
                    role='listbox'
                    aria-multiselectable='true'
                    className='absolute z-30 mt-1.5 max-h-72 w-full overflow-y-auto rounded-xl border border-line bg-white p-1 shadow-lg shadow-neutral-900/10'
                >
                    <li
                        role='option'
                        aria-selected={selectedLabels.length === 0}
                        onMouseDown={e => {
                            e.preventDefault()
                            onChange([])
                        }}
                        className={`flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-neutral-50 ${
                            selectedLabels.length === 0 ? "text-neutral-900" : "text-neutral-500"
                        }`}
                    >
                        <span>{allLabel}</span>
                        {selectedLabels.length === 0 && (
                            <LuCheck className='h-4 w-4 shrink-0 text-brand_main' />
                        )}
                    </li>

                    {options.map(opt => {
                        const checked = value.includes(opt.value)
                        return (
                            <li
                                key={opt.value}
                                role='option'
                                aria-selected={checked}
                                onMouseDown={e => {
                                    e.preventDefault()
                                    toggle(opt.value)
                                }}
                                className='flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-neutral-50'
                            >
                                <span className='truncate text-neutral-900'>{opt.label}</span>
                                <span
                                    aria-hidden='true'
                                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                                        checked
                                            ? "border-brand_main bg-brand_main text-white"
                                            : "border-neutral-300 bg-white"
                                    }`}
                                >
                                    {checked && <LuCheck className='h-3 w-3' />}
                                </span>
                            </li>
                        )
                    })}
                </ul>
            )}
        </div>
    )

    if (!label) {
        return (
            <div className={containerClassName}>
                {control}
                {error ? (
                    <p className='mt-1 text-xs text-red-600'>{error}</p>
                ) : hint ? (
                    <p className='mt-1 text-xs text-neutral-400'>{hint}</p>
                ) : null}
            </div>
        )
    }

    return (
        <Field
            label={label}
            hint={hint}
            error={error}
            htmlFor={buttonId}
            className={containerClassName}
        >
            {control}
        </Field>
    )
}
