"use client"
import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
    LuBriefcase,
    LuContact,
    LuSearch,
    LuTarget,
    LuUsers,
} from "react-icons/lu"

const GROUPS = [
    { key: "counterparties", label: "Контрагенты", icon: LuUsers },
    { key: "contacts", label: "Контакты", icon: LuContact },
    { key: "deals", label: "Сделки", icon: LuBriefcase },
    { key: "projects", label: "Проекты", icon: LuTarget },
]

// Инлайн-поиск на дашборде: результаты выпадают прямо под строкой,
// без модального окна (Ctrl+K-модал остаётся для остальных страниц).
export default function DashboardSearch() {
    const router = useRouter()
    const boxRef = useRef(null)
    const [q, setQ] = useState("")
    const [results, setResults] = useState(null)
    const [loading, setLoading] = useState(false)
    const [open, setOpen] = useState(false)
    const [active, setActive] = useState(0)

    const flat = useMemo(() => {
        if (!results) return []
        const out = []
        for (const g of GROUPS) {
            for (const item of results[g.key] || []) out.push(item)
        }
        return out
    }, [results])

    useEffect(() => {
        const query = q.trim()
        if (query.length < 2) {
            setResults(null)
            setOpen(false)
            setLoading(false)
            return
        }
        setLoading(true)
        setOpen(true)
        const controller = new AbortController()
        const t = setTimeout(() => {
            fetch(`/api/crm/search?q=${encodeURIComponent(query)}`, {
                signal: controller.signal,
            })
                .then(r => (r.ok ? r.json() : null))
                .then(d => {
                    if (d) {
                        setResults(d)
                        setActive(0)
                    }
                })
                .catch(() => {})
                .finally(() => setLoading(false))
        }, 250)
        return () => {
            controller.abort()
            clearTimeout(t)
        }
    }, [q])

    // Клик вне блока закрывает подсказки.
    useEffect(() => {
        function onDown(e) {
            if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false)
        }
        document.addEventListener("mousedown", onDown)
        return () => document.removeEventListener("mousedown", onDown)
    }, [])

    function go(item) {
        setOpen(false)
        setQ("")
        router.push(item.href)
    }

    function onKeyDown(e) {
        if (e.key === "Escape") {
            setOpen(false)
            return
        }
        if (!open || !flat.length) return
        if (e.key === "ArrowDown") {
            e.preventDefault()
            setActive(i => (i + 1) % flat.length)
        } else if (e.key === "ArrowUp") {
            e.preventDefault()
            setActive(i => (i - 1 + flat.length) % flat.length)
        } else if (e.key === "Enter") {
            e.preventDefault()
            if (flat[active]) go(flat[active])
        }
    }

    const total = flat.length
    let runningIndex = -1

    return (
        <div ref={boxRef} className='relative'>
            <div className='flex items-center gap-2.5 rounded-xl border border-brand_soft/50 bg-white/80 px-4 shadow-sm transition focus-within:border-brand_main/50 focus-within:bg-white'>
                <LuSearch className='h-4 w-4 shrink-0 text-brand_main/70' />
                <input
                    value={q}
                    onChange={e => setQ(e.target.value)}
                    onFocus={() => q.trim().length >= 2 && setOpen(true)}
                    onKeyDown={onKeyDown}
                    placeholder='Поиск: клиент, контакт, сделка, проект...'
                    className='w-full bg-transparent py-2.5 text-sm focus:outline-none'
                />
            </div>

            {open && (
                <div className='absolute inset-x-0 top-full z-30 mt-1.5 max-h-[60vh] overflow-y-auto rounded-xl border border-brand_soft/40 bg-white p-2 shadow-xl'>
                    {loading && (
                        <p className='px-3 py-4 text-center text-sm text-night_green/45'>
                            Ищем...
                        </p>
                    )}
                    {!loading && results && total === 0 && (
                        <p className='px-3 py-4 text-center text-sm text-night_green/45'>
                            Ничего не найдено по «{q.trim()}»
                        </p>
                    )}
                    {!loading &&
                        results &&
                        GROUPS.map(g => {
                            const items = results[g.key] || []
                            if (!items.length) return null
                            const Icon = g.icon
                            return (
                                <div key={g.key} className='mb-1'>
                                    <p className='px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-night_green/45'>
                                        {g.label}
                                    </p>
                                    {items.map(item => {
                                        runningIndex += 1
                                        const idx = runningIndex
                                        return (
                                            <button
                                                key={item.id}
                                                type='button'
                                                onClick={() => go(item)}
                                                onMouseEnter={() => setActive(idx)}
                                                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left ${
                                                    idx === active
                                                        ? "bg-brand_main/10"
                                                        : "hover:bg-brand_soft/20"
                                                }`}
                                            >
                                                <Icon className='h-4 w-4 shrink-0 text-brand_main/70' />
                                                <span className='min-w-0'>
                                                    <span className='block truncate text-sm font-medium text-night_green'>
                                                        {item.title}
                                                    </span>
                                                    {item.subtitle && (
                                                        <span className='block truncate text-xs text-night_green/55'>
                                                            {item.subtitle}
                                                        </span>
                                                    )}
                                                </span>
                                            </button>
                                        )
                                    })}
                                </div>
                            )
                        })}
                </div>
            )}
        </div>
    )
}
