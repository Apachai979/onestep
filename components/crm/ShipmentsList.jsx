"use client"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { LuSearch, LuTruck } from "react-icons/lu"
import {
    SHIPMENT_STATUSES,
    SHIPMENT_STATUS_COLORS,
    SHIPMENT_STATUS_LABELS,
    isShipmentOverdue,
} from "@/lib/crm/shipment"
import { EmptyState, TableSkeleton } from "@/components/crm/ui"

function safeJson(text) {
    try {
        return JSON.parse(text)
    } catch {
        return null
    }
}

function fmtDate(d) {
    if (!d) return "—"
    return new Date(d).toLocaleDateString("ru-RU")
}

function num(v) {
    if (v === null || v === undefined || v === "") return 0
    const s = typeof v === "object" && v.toString ? v.toString() : String(v)
    const n = Number(s.replace(",", "."))
    return Number.isFinite(n) ? n : 0
}

function fmtQty(v) {
    const n = num(v)
    return (Math.round(n * 1000) / 1000).toString().replace(".", ",")
}

function managerName(u) {
    if (!u) return "—"
    return `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email
}

export default function ShipmentsList() {
    const router = useRouter()
    const [items, setItems] = useState(null)
    const [error, setError] = useState("")
    const [q, setQ] = useState("")
    const [status, setStatus] = useState("")
    const [onlyWithRemaining, setOnlyWithRemaining] = useState(false)
    const [onlyOverdue, setOnlyOverdue] = useState(false)

    async function load() {
        setError("")
        try {
            const params = new URLSearchParams()
            if (status) params.set("status", status)
            if (q.trim()) params.set("q", q.trim())
            const r = await fetch(`/api/crm/shipments?${params}`)
            const text = await r.text()
            const data = text ? safeJson(text) : {}
            if (!r.ok) throw new Error(data?.error || `Ошибка ${r.status}`)
            setItems(data.items || [])
        } catch (err) {
            setError(err.message)
            setItems([])
        }
    }

    useEffect(() => {
        load()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status])

    const filtered = useMemo(() => {
        if (!items) return null
        return items.filter(sh => {
            if (onlyOverdue && !isShipmentOverdue(sh)) return false
            return true
        })
    }, [items, onlyOverdue])

    return (
        <div className='space-y-4'>
            <div className='grid gap-3 rounded-xl border border-brand_soft/40 bg-white/70 p-4 sm:grid-cols-4'>
                <div className='sm:col-span-2'>
                    <label className='mb-1 block text-xs text-night_green/65'>Поиск</label>
                    <div className='relative'>
                        <LuSearch className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-night_green/40' />
                        <input
                            value={q}
                            onChange={e => setQ(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && load()}
                            placeholder='Номер, сделка, клиент, трек'
                            className='w-full rounded-lg border border-brand_soft/60 bg-white pl-9 pr-3 py-2 text-sm shadow-sm focus:border-brand_main focus:outline-none'
                        />
                    </div>
                </div>
                <div>
                    <label className='mb-1 block text-xs text-night_green/65'>Статус</label>
                    <select
                        value={status}
                        onChange={e => setStatus(e.target.value)}
                        className='w-full rounded-lg border border-brand_soft/60 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand_main focus:outline-none'
                    >
                        <option value=''>Все</option>
                        {SHIPMENT_STATUSES.map(s => (
                            <option key={s} value={s}>
                                {SHIPMENT_STATUS_LABELS[s]}
                            </option>
                        ))}
                    </select>
                </div>
                <div className='flex flex-col gap-1 pt-5 text-xs'>
                    <label className='inline-flex items-center gap-2 text-gray-700'>
                        <input
                            type='checkbox'
                            checked={onlyOverdue}
                            onChange={e => setOnlyOverdue(e.target.checked)}
                            className='rounded'
                        />
                        Только просроченные
                    </label>
                </div>
            </div>

            {error && (
                <p className='rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700'>
                    {error}
                </p>
            )}

            <div className='overflow-x-auto rounded-xl border border-brand_soft/40 bg-white/70'>
                <table className='w-full text-sm'>
                    <thead className='sticky top-0 z-10 bg-brand_soft/30 text-left text-xs uppercase tracking-wider text-night_green/70 backdrop-blur'>
                        <tr>
                            <th className='px-3 py-2'>№</th>
                            <th className='px-3 py-2'>Статус</th>
                            <th className='px-3 py-2'>Сделка</th>
                            <th className='px-3 py-2'>Клиент</th>
                            <th className='px-3 py-2'>Менеджер</th>
                            <th className='px-3 py-2'>Плановая</th>
                            <th className='px-3 py-2'>Отгружена</th>
                            <th className='px-3 py-2 text-right'>Позиций</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items === null && <TableSkeleton rows={5} cols={8} />}
                        {filtered && filtered.length === 0 && (
                            <EmptyState
                                colSpan={8}
                                icon={LuTruck}
                                title='Отгрузок не найдено'
                                hint='Попробуйте изменить фильтры — или зайдите в нужную сделку и добавьте отгрузку.'
                            />
                        )}
                        {filtered?.map(sh => {
                            const totalQty = (sh.items || []).reduce(
                                (s, it) => s + num(it.quantity),
                                0,
                            )
                            const overdue = isShipmentOverdue(sh)
                            return (
                                <tr
                                    key={sh.id}
                                    onClick={() => router.push(`/crm/shipments/${sh.id}`)}
                                    className={`cursor-pointer border-t border-brand_soft/30 transition hover:bg-brand_soft/15 ${
                                        overdue ? "bg-red-50/30" : ""
                                    }`}
                                >
                                    <td className='px-3 py-2'>
                                        <Link
                                            href={`/crm/shipments/${sh.id}`}
                                            className='font-mono font-medium text-night_green hover:text-brand_main'
                                        >
                                            {sh.number}
                                        </Link>
                                    </td>
                                    <td className='px-3 py-2'>
                                        <span
                                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${SHIPMENT_STATUS_COLORS[sh.status]}`}
                                        >
                                            {SHIPMENT_STATUS_LABELS[sh.status]}
                                        </span>
                                        {overdue && (
                                            <span className='ml-1.5 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700'>
                                                Просрочена
                                            </span>
                                        )}
                                    </td>
                                    <td className='px-3 py-2'>
                                        <Link
                                            href={`/crm/deals/${sh.deal.id}`}
                                            onClick={e => e.stopPropagation()}
                                            className='text-night_green hover:text-brand_main'
                                        >
                                            {sh.deal.title || `Сделка #${sh.deal.id.slice(-6)}`}
                                        </Link>
                                    </td>
                                    <td className='px-3 py-2 text-gray-700'>
                                        {sh.deal.counterparty?.name || "—"}
                                    </td>
                                    <td className='px-3 py-2 text-gray-700'>
                                        {managerName(sh.deal.manager)}
                                    </td>
                                    <td className='px-3 py-2 text-gray-700'>
                                        {fmtDate(sh.plannedDate)}
                                    </td>
                                    <td className='px-3 py-2 text-gray-700'>
                                        {fmtDate(sh.shippedAt)}
                                    </td>
                                    <td className='px-3 py-2 text-right text-gray-700'>
                                        {sh.items?.length || 0} ({fmtQty(totalQty)})
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
