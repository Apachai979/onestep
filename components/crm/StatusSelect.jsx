"use client"
import { useEffect, useRef, useState } from "react"
import { LuCheck, LuChevronDown } from "react-icons/lu"

// Заметная кнопка-дропдаун для смены статуса на карточках (сделка, проект,
// аукцион). Заменяет нативный select-«пилюлю», который сливался с фоном.
//
// Точка-индикатор: оттенок берём из текстового класса цветовой схемы статуса
// (text-sky-700 → bg-sky-500). Классы перечислены литералами, чтобы Tailwind
// не вырезал их при сборке.
const DOT_BY_HUE = {
    sky: "bg-sky-500",
    blue: "bg-blue-500",
    violet: "bg-violet-500",
    amber: "bg-amber-500",
    teal: "bg-teal-500",
    emerald: "bg-emerald-500",
    red: "bg-red-500",
    neutral: "bg-neutral-400",
}

function dotClass(colorCls = "") {
    const hue = colorCls.match(/text-([a-z]+)-/)?.[1]
    return DOT_BY_HUE[hue] || "bg-neutral-400"
}

export default function StatusSelect({
    value,
    options,
    labels,
    colors,
    disabled,
    title,
    onChange,
}) {
    const [open, setOpen] = useState(false)
    const rootRef = useRef(null)

    useEffect(() => {
        if (!open) return
        function onDocClick(e) {
            if (!rootRef.current?.contains(e.target)) setOpen(false)
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

    function pick(s) {
        setOpen(false)
        if (s !== value) onChange(s)
    }

    return (
        <div ref={rootRef} className='relative'>
            <button
                type='button'
                title={title}
                disabled={disabled}
                aria-haspopup='listbox'
                aria-expanded={open}
                onClick={() => setOpen(o => !o)}
                className={`flex items-center gap-2.5 rounded-xl border bg-white py-1.5 pl-3 pr-2 text-left shadow-sm transition-colors disabled:cursor-default disabled:opacity-60 ${
                    open
                        ? "border-brand_main ring-2 ring-brand_main/20"
                        : "border-line hover:border-brand_main/50"
                }`}
            >
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dotClass(colors[value])}`} />
                <span className='flex min-w-0 flex-col'>
                    {/* <span className='text-[10px] font-medium uppercase leading-3 tracking-wider text-neutral-400'>
                        Статус
                    </span> */}
                    <span className='truncate text-sm font-semibold leading-5 text-neutral-900'>
                        {labels[value] || value}
                    </span>
                </span>
                <LuChevronDown
                    className={`h-4 w-4 shrink-0 text-neutral-400 transition-transform ${
                        open ? "rotate-180" : ""
                    }`}
                />
            </button>

            {open && (
                <ul
                    role='listbox'
                    className='absolute right-0 z-20 mt-1.5 w-64 rounded-xl border border-line bg-white p-1 shadow-lg'
                >
                    {options.map(s => (
                        <li key={s}>
                            <button
                                type='button'
                                role='option'
                                aria-selected={s === value}
                                onClick={() => pick(s)}
                                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm hover:bg-surface_muted ${
                                    s === value
                                        ? "font-semibold text-neutral-900"
                                        : "text-neutral-700"
                                }`}
                            >
                                <span
                                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${dotClass(colors[s])}`}
                                />
                                <span className='flex-1'>{labels[s] || s}</span>
                                {s === value && (
                                    <LuCheck className='h-4 w-4 shrink-0 text-brand_main' />
                                )}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}
