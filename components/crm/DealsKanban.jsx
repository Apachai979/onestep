"use client"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
    DEAL_STATUSES,
    DEAL_STATUS_COLORS,
    DEAL_STATUS_LABELS,
    dealDisplayTitle,
} from "@/lib/crm/deal"
import { formatMoney } from "@/lib/crm/format"

function safeJson(text) {
    try {
        return JSON.parse(text)
    } catch {
        return null
    }
}

function managerName(u) {
    if (!u) return "—"
    return `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email
}

export default function DealsKanban() {
    const [deals, setDeals] = useState(null)
    const [error, setError] = useState("")
    const [q, setQ] = useState("")
    const [draggingId, setDraggingId] = useState(null)
    const [dragOver, setDragOver] = useState(null)

    async function load() {
        setError("")
        try {
            const r = await fetch("/api/crm/deals")
            const text = await r.text()
            const data = text ? safeJson(text) : {}
            if (!r.ok) throw new Error(data?.error || `Ошибка ${r.status}`)
            setDeals(data.items || [])
        } catch (err) {
            setError(err.message)
            setDeals([])
        }
    }

    useEffect(() => {
        load()
    }, [])

    const filtered = useMemo(() => {
        if (!deals) return null
        if (!q.trim()) return deals
        const ql = q.toLowerCase()
        return deals.filter(d => {
            const title = (
                dealDisplayTitle(d, d.counterparty?.name) || ""
            ).toLowerCase()
            const cp = (d.counterparty?.name || "").toLowerCase()
            return title.includes(ql) || cp.includes(ql)
        })
    }, [deals, q])

    const byStatus = useMemo(() => {
        const map = Object.fromEntries(DEAL_STATUSES.map(s => [s, []]))
        for (const d of filtered || []) {
            if (map[d.status]) map[d.status].push(d)
        }
        return map
    }, [filtered])

    async function moveDeal(dealId, newStatus) {
        const prev = deals
        setDeals(curr => curr.map(d => (d.id === dealId ? { ...d, status: newStatus } : d)))
        try {
            const r = await fetch(`/api/crm/deals/${dealId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus }),
            })
            if (!r.ok) {
                const text = await r.text()
                const d = text ? safeJson(text) : {}
                throw new Error(d?.error || "Не удалось сменить статус")
            }
        } catch (err) {
            setDeals(prev)
            alert(err.message)
        }
    }

    function onDragStart(id) {
        return e => {
            setDraggingId(id)
            e.dataTransfer.effectAllowed = "move"
            e.dataTransfer.setData("text/plain", id)
        }
    }

    function onDragEnd() {
        setDraggingId(null)
        setDragOver(null)
    }

    function onDragOver(status) {
        return e => {
            e.preventDefault()
            e.dataTransfer.dropEffect = "move"
            if (dragOver !== status) setDragOver(status)
        }
    }

    function onDrop(status) {
        return e => {
            e.preventDefault()
            const id = e.dataTransfer.getData("text/plain") || draggingId
            setDragOver(null)
            setDraggingId(null)
            if (!id) return
            const deal = deals?.find(d => d.id === id)
            if (!deal || deal.status === status) return
            moveDeal(id, status)
        }
    }

    return (
        <div className='space-y-4'>
            <div className='flex flex-wrap items-end gap-3'>
                <div className='flex-1 min-w-[240px]'>
                    <label className='mb-1 block text-xs text-gray-600'>Поиск</label>
                    <input
                        value={q}
                        onChange={e => setQ(e.target.value)}
                        placeholder='Название сделки или клиента'
                        className='w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary_green focus:outline-none'
                    />
                </div>
                <Link
                    href='/crm/deals/new'
                    className='rounded-lg bg-primary_green px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-contrast_green'
                >
                    Новая сделка
                </Link>
            </div>

            {error && <p className='text-sm text-red-600'>{error}</p>}

            <div className='flex gap-3 overflow-x-auto pb-3'>
                {DEAL_STATUSES.map(status => {
                    const list = byStatus[status] || []
                    const sum = list.reduce((s, d) => s + Number(d.totalAmount || 0), 0)
                    return (
                        <div
                            key={status}
                            onDragOver={onDragOver(status)}
                            onDragLeave={() => setDragOver(null)}
                            onDrop={onDrop(status)}
                            className={`flex w-[280px] shrink-0 flex-col rounded-xl border bg-gray-50 p-3 ${
                                dragOver === status
                                    ? "border-primary_green ring-2 ring-primary_green/30"
                                    : "border-gray-200"
                            }`}
                        >
                            <div className='mb-3 flex items-center justify-between'>
                                <div className='flex items-center gap-2'>
                                    <span
                                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${DEAL_STATUS_COLORS[status]}`}
                                    >
                                        {DEAL_STATUS_LABELS[status]}
                                    </span>
                                    <span className='text-xs text-gray-500'>{list.length}</span>
                                </div>
                                <Link
                                    href={`/crm/deals/new?status=${status}`}
                                    className='rounded-md border border-gray-300 px-2 py-0.5 text-xs text-gray-600 hover:bg-white hover:text-primary_green'
                                    title='Добавить сделку с этим статусом'
                                >
                                    +
                                </Link>
                            </div>
                            <p className='mb-3 text-xs text-gray-500'>
                                Итого: {formatMoney(sum)}
                            </p>
                            <div className='flex flex-col gap-2'>
                                {deals === null && (
                                    <p className='text-xs text-gray-400'>Загрузка...</p>
                                )}
                                {list.map(d => (
                                    <DealCard
                                        key={d.id}
                                        deal={d}
                                        dragging={draggingId === d.id}
                                        onDragStart={onDragStart(d.id)}
                                        onDragEnd={onDragEnd}
                                    />
                                ))}
                                {deals !== null && list.length === 0 && (
                                    <p className='text-xs text-gray-400 italic'>Пусто</p>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

function DealCard({ deal, dragging, onDragStart, onDragEnd }) {
    const title = dealDisplayTitle(deal, deal.counterparty?.name)
    return (
        <Link
            href={`/crm/deals/${deal.id}`}
            draggable
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            className={`block cursor-grab rounded-lg border bg-white p-3 text-sm shadow-sm transition hover:border-primary_green active:cursor-grabbing ${
                dragging ? "opacity-50" : "border-gray-200"
            }`}
        >
            <p className='font-medium text-night_green'>{title}</p>
            <p className='mt-1 text-xs text-gray-600'>
                {deal.counterparty?.name || "Без клиента"}
            </p>
            <div className='mt-2 flex items-center justify-between text-xs'>
                <span className='text-gray-500'>{managerName(deal.manager)}</span>
                <span className='font-semibold text-gray-700'>
                    {formatMoney(deal.totalAmount)}
                </span>
            </div>
        </Link>
    )
}
