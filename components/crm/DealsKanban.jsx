"use client"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { LuPlus, LuSearch } from "react-icons/lu"
import {
    DEAL_STATUSES,
    DEAL_STATUS_COLORS,
    DEAL_STATUS_HINTS,
    DEAL_STATUS_LABELS,
    dealDisplayTitle,
} from "@/lib/crm/deal"

// Kanban показывает пять активных колонок; ARCHIVED — свалка старых
// CLOSED/CANCELLED (заполняется автоархиватором), из доски скрыт.
const KANBAN_STATUSES = DEAL_STATUSES.filter(s => s !== "ARCHIVED")

// Сдержанное оформление в стиле канбана проектов: нейтральные колонки,
// тонкая приглушённая акцентная полоска сверху для быстрой ориентации.
const COLUMN_ACCENT = {
    NEGOTIATION: "bg-blue-300/70",
    CONTRACT: "bg-violet-300/70",
    EXECUTION: "bg-amber-300/70",
    CLOSED: "bg-green-300/70",
    CANCELLED: "bg-red-300/70",
}
import { calculateDealShipmentProgress, isShipmentOverdue } from "@/lib/crm/shipment"
import { formatMoney } from "@/lib/crm/format"
import { Button, Field, Input, useToast } from "@/components/crm/ui"
import DealLossDialog from "./DealLossDialog"

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
    const toast = useToast()
    const [deals, setDeals] = useState(null)
    const [error, setError] = useState("")
    const [q, setQ] = useState("")
    const [draggingId, setDraggingId] = useState(null)
    const [dragOver, setDragOver] = useState(null)
    const [losingDeal, setLosingDeal] = useState(null)

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

    async function moveDeal(dealId, newStatus, extra = {}) {
        const prev = deals
        setDeals(curr => curr.map(d => (d.id === dealId ? { ...d, status: newStatus } : d)))
        try {
            const r = await fetch(`/api/crm/deals/${dealId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus, ...extra }),
            })
            if (!r.ok) {
                const text = await r.text()
                const d = text ? safeJson(text) : {}
                throw new Error(d?.error || "Не удалось сменить статус")
            }
        } catch (err) {
            setDeals(prev)
            toast.error(err.message)
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
            // Перенос в «Не реализована» — только с причиной.
            if (status === "CANCELLED") {
                setLosingDeal(deal)
                return
            }
            moveDeal(id, status)
        }
    }

    return (
        <div className='space-y-4'>
            <div className='flex flex-wrap items-end gap-3'>
                <Field label='Поиск' className='flex-1 min-w-[240px]'>
                    <Input
                        icon={LuSearch}
                        value={q}
                        onChange={e => setQ(e.target.value)}
                        placeholder='Название сделки или клиента'
                    />
                </Field>
                <Button href='/crm/deals/new'>
                    <LuPlus className='h-4 w-4' />
                    Новая сделка
                </Button>
            </div>

            {error && <p className='text-sm text-red-600'>{error}</p>}

            <div className='flex gap-3 overflow-x-auto pb-3'>
                {KANBAN_STATUSES.map(status => {
                    const list = byStatus[status] || []
                    const sum = list.reduce((s, d) => s + Number(d.totalAmount || 0), 0)
                    return (
                        <div
                            key={status}
                            onDragOver={onDragOver(status)}
                            onDragLeave={() => setDragOver(null)}
                            onDrop={onDrop(status)}
                            className={`flex w-[290px] shrink-0 flex-col overflow-hidden rounded-2xl border bg-surface_muted transition-shadow ${
                                dragOver === status
                                    ? "border-brand_main ring-2 ring-brand_main/25"
                                    : "border-line"
                            }`}
                        >
                            <div className={`h-0.5 w-full ${COLUMN_ACCENT[status]}`} />
                            <div className='flex flex-1 flex-col p-3'>
                                <div className='mb-1 flex items-center justify-between'>
                                    <div className='flex items-center gap-2'>
                                        <span
                                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${DEAL_STATUS_COLORS[status]}`}
                                        >
                                            {DEAL_STATUS_LABELS[status]}
                                        </span>
                                        <span className='text-xs text-neutral-400'>{list.length}</span>
                                    </div>
                                    {(status === "NEGOTIATION" || status === "CONTRACT") && (
                                        <Link
                                            href={`/crm/deals/new?status=${status}`}
                                            className='inline-flex h-6 w-6 items-center justify-center rounded-lg border border-line bg-white text-neutral-500 transition-colors hover:text-brand_main hover:border-brand_main/40'
                                            title='Добавить сделку с этим статусом'
                                        >
                                            +
                                        </Link>
                                    )}
                                </div>
                                {DEAL_STATUS_HINTS[status] && (
                                    <p className='mb-1 text-[10px] leading-tight text-neutral-400'>
                                        {DEAL_STATUS_HINTS[status]}
                                    </p>
                                )}
                                <p className='mb-3 text-xs text-neutral-500'>
                                    Итого: {formatMoney(sum)}
                                </p>
                                <div className='flex flex-col gap-2'>
                                    {deals === null && (
                                        <p className='text-xs text-neutral-400'>Загрузка...</p>
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
                                        <p className='text-xs italic text-neutral-400'>Пусто</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            {losingDeal && (
                <DealLossDialog
                    dealTitle={dealDisplayTitle(losingDeal, losingDeal.counterparty?.name)}
                    onCancel={() => setLosingDeal(null)}
                    onConfirm={({ lossReason, lossComment }) => {
                        moveDeal(losingDeal.id, "CANCELLED", { lossReason, lossComment })
                        setLosingDeal(null)
                    }}
                />
            )}
        </div>
    )
}

function DealCard({ deal, dragging, onDragStart, onDragEnd }) {
    const title = dealDisplayTitle(deal, deal.counterparty?.name)
    const hasItems = Array.isArray(deal.items) && deal.items.length > 0
    const progress = hasItems ? calculateDealShipmentProgress(deal) : null
    const hasOverdue =
        Array.isArray(deal.shipments) && deal.shipments.some(isShipmentOverdue)

    return (
        <Link
            href={`/crm/deals/${deal.id}`}
            draggable
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            className={`block cursor-pointer rounded-xl border bg-white p-3 text-sm shadow-sm transition-all duration-200 hover:border-line_strong hover:shadow-md ${
                dragging ? "opacity-50" : "border-line"
            }`}
        >
            <p className='font-medium leading-snug text-neutral-900'>{title}</p>
            <p className='mt-1 truncate text-xs text-neutral-500'>
                {deal.counterparty?.name || "Без клиента"}
            </p>
            <div className='mt-2 flex items-center justify-between gap-2 text-xs'>
                <span className='truncate text-neutral-500'>{managerName(deal.manager)}</span>
                <span className='shrink-0 font-semibold text-neutral-700'>
                    {formatMoney(deal.totalAmount)}
                </span>
            </div>
            {progress && progress.totalOrdered > 0 && (
                <div className='mt-2'>
                    <div className='flex items-center justify-between text-[10px] text-neutral-500'>
                        <span>
                            Отгружено {progress.percent}%
                            {progress.isFullyShipped && (
                                <span className='ml-1 text-emerald-600'>· готово</span>
                            )}
                        </span>
                        {hasOverdue && (
                            <span className='rounded-full bg-red-50 px-1.5 py-0.5 text-[9px] font-semibold text-red-700'>
                                Просрочка
                            </span>
                        )}
                    </div>
                    <div className='mt-1 h-1.5 w-full overflow-hidden rounded-full bg-neutral-200'>
                        <div
                            className={`h-full transition-all ${
                                progress.isFullyShipped ? "bg-emerald-500" : "bg-brand_main"
                            }`}
                            style={{ width: `${progress.percent}%` }}
                        />
                    </div>
                </div>
            )}
        </Link>
    )
}
