"use client"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
    AUCTION_STATUSES,
    AUCTION_STATUS_COLORS,
    AUCTION_STATUS_LABELS,
    auctionDisplayTitle,
} from "@/lib/crm/auction"
import { LuSearch } from "react-icons/lu"
import { formatMoney } from "@/lib/crm/format"
import { Badge, Field, Input, useToast } from "@/components/crm/ui"
import DealLossDialog from "./DealLossDialog"

// Приглушённая акцентная полоска сверху колонки — в стиле канбана сделок.
const COLUMN_ACCENT = {
    IN_PROGRESS: "bg-blue-300/70",
    WON: "bg-green-300/70",
    LOST: "bg-red-300/70",
    CANCELLED: "bg-gray-300/70",
}

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

export default function AuctionsKanban() {
    const toast = useToast()
    const [auctions, setAuctions] = useState(null)
    const [error, setError] = useState("")
    const [q, setQ] = useState("")
    const [draggingId, setDraggingId] = useState(null)
    const [dragOver, setDragOver] = useState(null)
    const [losing, setLosing] = useState(null)

    async function load() {
        setError("")
        try {
            const r = await fetch("/api/crm/auctions")
            const text = await r.text()
            const data = text ? safeJson(text) : {}
            if (!r.ok) throw new Error(data?.error || `Ошибка ${r.status}`)
            setAuctions(data.items || [])
        } catch (err) {
            setError(err.message)
            setAuctions([])
        }
    }

    useEffect(() => {
        load()
    }, [])

    const filtered = useMemo(() => {
        if (!auctions) return null
        if (!q.trim()) return auctions
        const ql = q.toLowerCase()
        return auctions.filter(a => {
            const title = (a.purchaseNumber || "").toLowerCase()
            const cp = (a.customer?.name || "").toLowerCase()
            const sup = (a.supplier?.name || "").toLowerCase()
            return title.includes(ql) || cp.includes(ql) || sup.includes(ql)
        })
    }, [auctions, q])

    const byStatus = useMemo(() => {
        const map = Object.fromEntries(AUCTION_STATUSES.map(s => [s, []]))
        for (const a of filtered || []) {
            if (map[a.status]) map[a.status].push(a)
        }
        return map
    }, [filtered])

    async function move(id, newStatus, extra = {}) {
        const prev = auctions
        setAuctions(curr => curr.map(a => (a.id === id ? { ...a, status: newStatus } : a)))
        try {
            const r = await fetch(`/api/crm/auctions/${id}`, {
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
            setAuctions(prev)
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
            const auction = auctions?.find(a => a.id === id)
            if (!auction || auction.status === status) return
            // Перенос в «Проиграли» — только с указанием причины.
            if (status === "LOST") {
                setLosing(auction)
                return
            }
            move(id, status)
        }
    }

    return (
        <div className='space-y-4'>
            <div className='flex flex-wrap items-end gap-3'>
                <Field label='Поиск' className='min-w-[240px] flex-1'>
                    <Input
                        icon={LuSearch}
                        value={q}
                        onChange={e => setQ(e.target.value)}
                        placeholder='Номер закупки, заказчик или поставщик'
                    />
                </Field>
            </div>

            {error && <p className='text-sm text-red-600'>{error}</p>}

            <div className='flex gap-3 overflow-x-auto pb-3'>
                {AUCTION_STATUSES.map(status => {
                    const list = byStatus[status] || []
                    const sum = list.reduce((s, a) => s + Number(a.nmck || 0), 0)
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
                                <div className='mb-1 flex items-center gap-2'>
                                    <Badge className={AUCTION_STATUS_COLORS[status]}>
                                        {AUCTION_STATUS_LABELS[status]}
                                    </Badge>
                                    <span className='text-xs text-neutral-400'>{list.length}</span>
                                </div>
                                <p className='mb-3 text-xs text-neutral-500'>
                                    Итого НМЦК: {formatMoney(sum)}
                                </p>
                                <div className='flex flex-col gap-2'>
                                    {auctions === null && (
                                        <p className='text-xs text-neutral-400'>Загрузка...</p>
                                    )}
                                    {list.map(a => (
                                        <AuctionCard
                                            key={a.id}
                                            auction={a}
                                            dragging={draggingId === a.id}
                                            onDragStart={onDragStart(a.id)}
                                            onDragEnd={onDragEnd}
                                        />
                                    ))}
                                    {auctions !== null && list.length === 0 && (
                                        <p className='text-xs italic text-neutral-400'>Пусто</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            {losing && (
                <DealLossDialog
                    dealTitle={auctionDisplayTitle(losing)}
                    title='Почему проиграли аукцион?'
                    confirmLabel='Аукцион проигран'
                    reasons={[]}
                    commentRequired
                    commentLabel='Причина проигрыша'
                    commentPlaceholder='Например: конкурент опустил цену ниже нашей минимальной'
                    onCancel={() => setLosing(null)}
                    onConfirm={({ lossComment }) => {
                        move(losing.id, "LOST", { lossComment })
                        setLosing(null)
                    }}
                />
            )}
        </div>
    )
}

function AuctionCard({ auction, dragging, onDragStart, onDragEnd }) {
    return (
        <Link
            href={`/crm/auctions/${auction.id}`}
            draggable
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            className={`block cursor-grab rounded-xl border bg-white p-3 text-sm shadow-sm transition-all duration-200 hover:border-line_strong hover:shadow-md active:cursor-grabbing ${
                dragging ? "opacity-50" : "border-line"
            }`}
        >
            <p className='font-medium leading-snug text-neutral-900'>
                {auctionDisplayTitle(auction)}
            </p>
            <p className='mt-1 truncate text-xs text-neutral-500'>
                {auction.customer?.name || "Заказчик не указан"}
            </p>
            <div className='mt-2 flex items-center justify-between gap-2 text-xs'>
                <span className='truncate text-neutral-500'>{managerName(auction.manager)}</span>
                <span className='shrink-0 font-semibold text-neutral-700'>
                    {formatMoney(auction.nmck)}
                </span>
            </div>
        </Link>
    )
}
