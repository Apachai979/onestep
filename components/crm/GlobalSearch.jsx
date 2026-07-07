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

// Глобальный поиск по CRM (Ctrl+K): контрагенты, контакты, сделки, проекты.
export default function GlobalSearch({ open, onClose }) {
    const router = useRouter()
    const inputRef = useRef(null)
    const [q, setQ] = useState("")
    const [results, setResults] = useState(null)
    const [loading, setLoading] = useState(false)
    const [active, setActive] = useState(0)

    // Плоский список для клавиатурной навигации.
    const flat = useMemo(() => {
        if (!results) return []
        const out = []
        for (const g of GROUPS) {
            for (const item of results[g.key] || []) {
                out.push({ ...item, group: g.key })
            }
        }
        return out
    }, [results])

    useEffect(() => {
        if (!open) return
        setQ("")
        setResults(null)
        setActive(0)
        const t = setTimeout(() => inputRef.current?.focus(), 50)
        return () => clearTimeout(t)
    }, [open])

    useEffect(() => {
        if (!open) return
        const query = q.trim()
        if (query.length < 2) {
            setResults(null)
            setLoading(false)
            return
        }
        setLoading(true)
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
    }, [q, open])

    function go(item) {
        onClose()
        router.push(item.href)
    }

    function onKeyDown(e) {
        if (e.key === "Escape") {
            onClose()
            return
        }
        if (!flat.length) return
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

    if (!open) return null

    const total = flat.length
    let runningIndex = -1

    return (
        <div
            className='fixed inset-0 z-50 flex items-start justify-center bg-night_green/30 p-4 pt-[12vh] backdrop-blur-sm'
            onClick={onClose}
        >
            <div
                onClick={e => e.stopPropagation()}
                onKeyDown={onKeyDown}
                className='w-full max-w-xl overflow-hidden rounded-xl bg-white shadow-2xl'
            >
                <div className='flex items-center gap-2.5 border-b border-brand_soft/40 px-4'>
                    <LuSearch className='h-4 w-4 shrink-0 text-night_green/40' />
                    <input
                        ref={inputRef}
                        value={q}
                        onChange={e => setQ(e.target.value)}
                        placeholder='Клиент, контакт, сделка, проект...'
                        className='w-full bg-transparent py-3.5 text-sm focus:outline-none'
                    />
                    <kbd className='hidden shrink-0 rounded border border-brand_soft/60 px-1.5 py-0.5 text-[10px] text-night_green/45 sm:block'>
                        Esc
                    </kbd>
                </div>

                <div className='max-h-[55vh] overflow-y-auto p-2'>
                    {q.trim().length < 2 && (
                        <p className='px-3 py-6 text-center text-sm text-night_green/45'>
                            Введите минимум два символа — ищем по названиям, ИНН,
                            телефонам и email.
                        </p>
                    )}
                    {q.trim().length >= 2 && !loading && results && total === 0 && (
                        <p className='px-3 py-6 text-center text-sm text-night_green/45'>
                            Ничего не найдено по «{q.trim()}»
                        </p>
                    )}
                    {loading && (
                        <p className='px-3 py-6 text-center text-sm text-night_green/45'>
                            Ищем...
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
            </div>
        </div>
    )
}
