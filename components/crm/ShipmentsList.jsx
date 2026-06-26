"use client"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
    SHIPMENT_STATUSES,
    SHIPMENT_STATUS_COLORS,
    SHIPMENT_STATUS_LABELS,
    isShipmentOverdue,
} from "@/lib/crm/shipment"

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
            <div className='grid gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:grid-cols-4'>
                <div className='sm:col-span-2'>
                    <label className='mb-1 block text-xs text-gray-600'>Поиск</label>
                    <input
                        value={q}
                        onChange={e => setQ(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && load()}
                        placeholder='Номер, сделка, клиент, трек'
                        className='w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary_green focus:outline-none'
                    />
                </div>
                <div>
                    <label className='mb-1 block text-xs text-gray-600'>Статус</label>
                    <select
                        value={status}
                        onChange={e => setStatus(e.target.value)}
                        className='w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary_green focus:outline-none'
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

            {error && <p className='text-sm text-red-600'>{error}</p>}

            <div className='overflow-x-auto rounded-xl border border-gray-200 bg-white'>
                <table className='w-full text-sm'>
                    <thead className='bg-gray-50 text-left text-xs uppercase text-gray-500'>
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
                        {items === null && (
                            <tr>
                                <td colSpan={8} className='px-3 py-6 text-center text-gray-400'>
                                    Загрузка...
                                </td>
                            </tr>
                        )}
                        {filtered && filtered.length === 0 && (
                            <tr>
                                <td colSpan={8} className='px-3 py-6 text-center text-gray-400'>
                                    Ничего не найдено.
                                </td>
                            </tr>
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
                                    className={`border-t border-gray-100 hover:bg-gray-50 ${
                                        overdue ? "bg-red-50/30" : ""
                                    }`}
                                >
                                    <td className='px-3 py-2'>
                                        <Link
                                            href={`/crm/shipments/${sh.id}`}
                                            className='font-mono font-medium text-night_green hover:text-primary_green'
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
                                            className='text-night_green hover:text-primary_green'
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
