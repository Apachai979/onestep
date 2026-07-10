"use client"
import { useEffect, useMemo, useRef, useState } from "react"

export default function SearchableSelect({
    value,
    onChange,
    options,
    placeholder = "— Выберите —",
    emptyLabel = "Ничего не найдено",
    required = false,
    disabled = false,
    maxItems = 20,
}) {
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState("")
    const [activeIdx, setActiveIdx] = useState(0)
    const containerRef = useRef(null)
    const inputRef = useRef(null)
    const listRef = useRef(null)

    const selected = useMemo(
        () => (value ? options.find(o => o.id === value) || null : null),
        [value, options],
    )

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase()
        if (!q) return options.slice(0, maxItems)
        return options
            .filter(o => (o.search || o.label || "").toLowerCase().includes(q))
            .slice(0, maxItems)
    }, [options, query, maxItems])

    useEffect(() => {
        if (open) setActiveIdx(0)
    }, [open, query])

    useEffect(() => {
        function onDocClick(e) {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                close()
            }
        }
        if (open) document.addEventListener("mousedown", onDocClick)
        return () => document.removeEventListener("mousedown", onDocClick)
    }, [open])

    function close() {
        setOpen(false)
        setQuery("")
    }

    function openDropdown() {
        if (disabled) return
        setQuery("")
        setOpen(true)
        requestAnimationFrame(() => inputRef.current?.focus())
    }

    function choose(opt) {
        onChange(opt.id)
        close()
    }

    function clear() {
        onChange("")
        close()
    }

    function onKeyDown(e) {
        if (!open) return
        if (e.key === "ArrowDown") {
            e.preventDefault()
            setActiveIdx(i => Math.min(i + 1, filtered.length - 1))
        } else if (e.key === "ArrowUp") {
            e.preventDefault()
            setActiveIdx(i => Math.max(i - 1, 0))
        } else if (e.key === "Enter") {
            e.preventDefault()
            const opt = filtered[activeIdx]
            if (opt) choose(opt)
        } else if (e.key === "Escape") {
            e.preventDefault()
            close()
        }
    }

    return (
        <div className='relative' ref={containerRef}>
            {required && (
                <input
                    type='text'
                    tabIndex={-1}
                    value={value || ""}
                    onChange={() => {}}
                    required
                    className='pointer-events-none absolute h-0 w-0 opacity-0'
                />
            )}

            {!open ? (
                <button
                    type='button'
                    onClick={openDropdown}
                    disabled={disabled}
                    className='flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-line bg-white px-3 text-left text-sm shadow-sm transition-all duration-200 focus:border-brand_main focus:outline-none focus:ring-2 focus:ring-brand_main/20 disabled:bg-surface_muted disabled:text-neutral-400'
                >
                    <span className={`truncate ${selected ? "text-neutral-900" : "text-neutral-400"}`}>
                        {selected ? selected.label : placeholder}
                    </span>
                    {selected ? (
                        <span
                            onClick={e => {
                                e.stopPropagation()
                                if (!disabled) clear()
                            }}
                            role='button'
                            className='shrink-0 cursor-pointer rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700'
                            aria-label='Очистить'
                        >
                            ×
                        </span>
                    ) : (
                        <span className='shrink-0 text-neutral-400'>▾</span>
                    )}
                </button>
            ) : (
                <input
                    ref={inputRef}
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder='Введите название или ИНН'
                    className='h-10 w-full rounded-xl border border-brand_main bg-white px-3 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand_main/20'
                />
            )}

            {open && (
                <ul
                    ref={listRef}
                    className='absolute z-30 mt-1.5 max-h-72 w-full overflow-y-auto rounded-xl border border-line bg-white p-1 shadow-lg shadow-neutral-900/10'
                >
                    {filtered.length === 0 && (
                        <li className='px-3 py-2 text-sm text-neutral-400'>{emptyLabel}</li>
                    )}
                    {filtered.map((opt, idx) => (
                        <li
                            key={opt.id}
                            onMouseDown={e => {
                                e.preventDefault()
                                choose(opt)
                            }}
                            onMouseEnter={() => setActiveIdx(idx)}
                            className={`cursor-pointer rounded-lg px-3 py-2 text-sm transition-colors ${
                                idx === activeIdx ? "bg-neutral-100" : "hover:bg-neutral-50"
                            }`}
                        >
                            <div className='font-medium text-neutral-900'>{opt.label}</div>
                            {opt.sublabel && (
                                <div className='text-xs text-neutral-500'>{opt.sublabel}</div>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}
