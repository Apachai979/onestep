"use client"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { LuPlus, LuSearch, LuUsers } from "react-icons/lu"
import { formatMoney, formatPercent } from "@/lib/crm/format"
import { EmptyState, TableSkeleton } from "@/components/crm/ui"

function safeJson(text) {
    try {
        return JSON.parse(text)
    } catch {
        return null
    }
}

export default function CounterpartyList({ type, newHref }) {
    const router = useRouter()
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
            <div className='flex flex-wrap items-end gap-3 rounded-xl border border-brand_soft/40 bg-white/70 p-4'>
                <div className='flex-1 min-w-[220px]'>
                    <label className='mb-1 block text-xs text-night_green/65'>Поиск</label>
                    <div className='relative'>
                        <LuSearch className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-night_green/40' />
                        <input
                            value={q}
                            onChange={e => setQ(e.target.value)}
                            placeholder='Название, ИНН, контактное лицо'
                            className='w-full rounded-lg border border-brand_soft/60 bg-white pl-9 pr-3 py-2 text-sm shadow-sm focus:border-brand_main focus:outline-none'
                        />
                    </div>
                </div>
                <div className='min-w-[200px]'>
                    <label className='mb-1 block text-xs text-night_green/65'>Регион</label>
                    <input
                        value={region}
                        onChange={e => setRegion(e.target.value)}
                        className='w-full rounded-lg border border-brand_soft/60 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand_main focus:outline-none'
                    />
                </div>
                <Link
                    href={newHref}
                    className='inline-flex items-center gap-2 rounded-lg bg-brand_main px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand_main/90'
                >
                    <LuPlus className='h-4 w-4' />
                    Добавить
                </Link>
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
                        {items === null && <TableSkeleton rows={5} cols={7} />}
                        {items?.length === 0 && (
                            <EmptyState
                                colSpan={7}
                                icon={LuUsers}
                                title='Записей не найдено'
                                hint='Попробуйте изменить запрос или сбросить фильтры.'
                            />
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
                                    onClick={() =>
                                        router.push(`/crm/counterparties/${item.id}`)
                                    }
                                    className='cursor-pointer border-t border-brand_soft/30 transition hover:bg-brand_soft/15'
                                >
                                    <td className='px-4 py-3'>
                                        <Link
                                            href={`/crm/counterparties/${item.id}`}
                                            className='font-medium text-night_green hover:text-brand_main'
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
