"use client"
import Link from "next/link"
import { useEffect, useState } from "react"
import { formatMoney, formatPercent } from "@/lib/crm/format"

function safeJson(text) {
    try {
        return JSON.parse(text)
    } catch {
        return null
    }
}

export default function CounterpartyList({ type, newHref }) {
    const [items, setItems] = useState(null)
    const [error, setError] = useState("")
    const [q, setQ] = useState("")
    const [region, setRegion] = useState("")

    useEffect(() => {
        const controller = new AbortController()
        const params = new URLSearchParams({ type })
        if (q.trim()) params.set("q", q.trim())
        if (region.trim()) params.set("region", region.trim())

        setError("")
        fetch(`/api/crm/counterparties?${params.toString()}`, { signal: controller.signal })
            .then(async r => {
                const text = await r.text()
                const data = text ? safeJson(text) : {}
                if (!r.ok) throw new Error(data?.error || `Ошибка ${r.status}`)
                return data
            })
            .then(data => setItems(data.items || []))
            .catch(err => {
                if (err.name === "AbortError") return
                setError(err.message)
                setItems([])
            })

        return () => controller.abort()
    }, [type, q, region])

    return (
        <div className='space-y-4'>
            <div className='flex flex-wrap items-end gap-3'>
                <div className='flex-1 min-w-[220px]'>
                    <label className='mb-1 block text-xs text-gray-600'>Поиск</label>
                    <input
                        value={q}
                        onChange={e => setQ(e.target.value)}
                        placeholder='Название, ИНН, контактное лицо'
                        className='w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary_green focus:outline-none'
                    />
                </div>
                <div className='min-w-[200px]'>
                    <label className='mb-1 block text-xs text-gray-600'>Регион</label>
                    <input
                        value={region}
                        onChange={e => setRegion(e.target.value)}
                        className='w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary_green focus:outline-none'
                    />
                </div>
                <Link
                    href={newHref}
                    className='rounded-lg bg-primary_green px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-contrast_green'
                >
                    Добавить
                </Link>
            </div>

            {error && <p className='text-sm text-red-600'>{error}</p>}

            <div className='overflow-x-auto rounded-xl border border-gray-200 bg-white'>
                <table className='w-full text-sm'>
                    <thead className='bg-gray-50 text-left text-xs uppercase text-gray-500'>
                        <tr>
                            <th className='px-4 py-3'>Название</th>
                            <th className='px-4 py-3'>Регион</th>
                            <th className='px-4 py-3'>ИНН</th>
                            <th className='px-4 py-3'>Контактное лицо</th>
                            <th className='px-4 py-3'>Телефон</th>
                            <th className='px-4 py-3 text-right'>Бюджет</th>
                            <th className='px-4 py-3 text-right'>Скидка</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items === null && (
                            <tr>
                                <td colSpan={7} className='px-4 py-6 text-center text-gray-400'>
                                    Загрузка...
                                </td>
                            </tr>
                        )}
                        {items?.length === 0 && (
                            <tr>
                                <td colSpan={7} className='px-4 py-6 text-center text-gray-400'>
                                    Записей не найдено
                                </td>
                            </tr>
                        )}
                        {items?.map(item => {
                            const primary = item.contacts?.[0]
                            const primaryName = primary
                                ? `${primary.firstName ?? ""} ${primary.lastName ?? ""}`.trim() ||
                                  primary.email ||
                                  primary.phone ||
                                  "—"
                                : "—"
                            return (
                                <tr
                                    key={item.id}
                                    className='border-t border-gray-100 hover:bg-gray-50'
                                >
                                    <td className='px-4 py-3'>
                                        <Link
                                            href={`/crm/counterparties/${item.id}`}
                                            className='font-medium text-night_green hover:text-primary_green'
                                        >
                                            {item.name}
                                        </Link>
                                    </td>
                                    <td className='px-4 py-3 text-gray-700'>{item.region}</td>
                                    <td className='px-4 py-3 text-gray-700'>
                                        {item.inn || "—"}
                                    </td>
                                    <td className='px-4 py-3 text-gray-700'>{primaryName}</td>
                                    <td className='px-4 py-3 text-gray-700'>
                                        {item.phone || primary?.phone || "—"}
                                    </td>
                                    <td className='px-4 py-3 text-right text-gray-700'>
                                        {formatMoney(item.totalRevenue)}
                                    </td>
                                    <td className='px-4 py-3 text-right text-gray-700'>
                                        {formatPercent(item.discount)}
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
