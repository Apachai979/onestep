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
                    className='flex w-full items-center justify-between gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-left text-sm shadow-sm focus:border-primary_green focus:outline-none disabled:bg-gray-50 disabled:text-gray-400'
                >
                    <span className={selected ? "text-gray-900" : "text-gray-400"}>
                        {selected ? selected.label : placeholder}
                    </span>
                    {selected ? (
                        <span
                            onClick={e => {
                                e.stopPropagation()
                                if (!disabled) clear()
                            }}
                            role='button'
                            className='cursor-pointer rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700'
                            aria-label='Очистить'
                        >
                            ×
                        </span>
                    ) : (
                        <span className='text-gray-400'>▾</span>
                    )}
                </button>
            ) : (
                <input
                    ref={inputRef}
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder='Введите название или ИНН'
                    className='w-full rounded-lg border border-primary_green bg-white px-3 py-2 text-sm shadow-sm focus:outline-none'
                />
            )}

            {open && (
                <ul
                    ref={listRef}
                    className='absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg'
                >
                    {filtered.length === 0 && (
                        <li className='px-3 py-2 text-sm text-gray-400'>{emptyLabel}</li>
                    )}
                    {filtered.map((opt, idx) => (
                        <li
                            key={opt.id}
                            onMouseDown={e => {
                                e.preventDefault()
                                choose(opt)
                            }}
                            onMouseEnter={() => setActiveIdx(idx)}
                            className={`cursor-pointer px-3 py-2 text-sm ${
                                idx === activeIdx ? "bg-primary_green/10" : "hover:bg-gray-50"
                            }`}
                        >
                            <div className='font-medium text-night_green'>{opt.label}</div>
                            {opt.sublabel && (
                                <div className='text-xs text-gray-500'>{opt.sublabel}</div>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}
