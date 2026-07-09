"use client"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { LuGavel, LuSearch } from "react-icons/lu"
import {
    AUCTION_STATUSES,
    AUCTION_STATUS_COLORS,
    AUCTION_STATUS_LABELS,
    auctionDisplayTitle,
} from "@/lib/crm/auction"
import { formatMoney } from "@/lib/crm/format"
import SearchableSelect from "./SearchableSelect"
import { CardListSkeleton, CardRow, EmptyState, MobileCard, TableSkeleton } from "@/components/crm/ui"

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

function fmtDate(d) {
    if (!d) return "—"
    return new Date(d).toLocaleDateString("ru-RU")
}

export default function AuctionsList({ currentUserId }) {
    const router = useRouter()
    const [items, setItems] = useState(null)
    const [error, setError] = useState("")
    const [filters, setFilters] = useState({ status: "", managerId: "", q: "" })
    const [managers, setManagers] = useState([])

    useEffect(() => {
        fetch("/api/crm/users")
            .then(r => (r.ok ? r.json() : { items: [] }))
            .catch(() => ({ items: [] }))
            .then(u => setManagers(u.items || []))
    }, [])

    async function load() {
        setError("")
        const params = new URLSearchParams()
        if (filters.status) params.set("status", filters.status)
        if (filters.managerId) params.set("managerId", filters.managerId)
        if (filters.q.trim()) params.set("q", filters.q.trim())
        const r = await fetch(`/api/crm/auctions?${params.toString()}`)
        const text = await r.text()
        const data = text ? safeJson(text) : {}
        if (!r.ok) {
            setError(data?.error || `Ошибка ${r.status}`)
            setItems([])
            return
        }
        setItems(data.items || [])
    }

    useEffect(() => {
        load()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters.status, filters.managerId])

    const managerOptions = useMemo(
        () =>
            managers.map(u => {
                const name = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email
                return {
                    id: u.id,
                    label: u.id === currentUserId ? `${name} (вы)` : name,
                    search: `${u.firstName ?? ""} ${u.lastName ?? ""} ${u.email ?? ""}`,
                }
            }),
        [managers, currentUserId],
    )

    const total = items?.reduce((s, a) => s + Number(a.nmck || 0), 0) ?? 0

    return (
        <div className='space-y-4'>
            <div className='grid gap-3 rounded-xl border border-brand_soft/40 bg-white/70 p-4 sm:grid-cols-4'>
                <div className='sm:col-span-2'>
                    <label className='mb-1 block text-xs text-night_green/65'>Поиск</label>
                    <div className='relative'>
                        <LuSearch className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-night_green/40' />
                        <input
                            value={filters.q}
                            onChange={e => setFilters(p => ({ ...p, q: e.target.value }))}
                            onKeyDown={e => e.key === "Enter" && load()}
                            placeholder='Номер закупки, заказчик или поставщик'
                            className='w-full rounded-lg border border-brand_soft/60 bg-white pl-9 pr-3 py-2 text-sm shadow-sm focus:border-brand_main focus:outline-none'
                        />
                    </div>
                </div>
                <div>
                    <label className='mb-1 block text-xs text-night_green/65'>Статус</label>
                    <select
                        value={filters.status}
                        onChange={e => setFilters(p => ({ ...p, status: e.target.value }))}
                        className='w-full rounded-lg border border-brand_soft/60 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand_main focus:outline-none'
                    >
                        <option value=''>Все</option>
                        {AUCTION_STATUSES.map(s => (
                            <option key={s} value={s}>
                                {AUCTION_STATUS_LABELS[s]}
                            </option>
                        ))}
                    </select>
                </div>
                <div className='flex items-end'>
                    {currentUserId && (
                        <button
                            type='button'
                            onClick={() =>
                                setFilters(p => ({
                                    ...p,
                                    managerId:
                                        p.managerId === currentUserId ? "" : currentUserId,
                                }))
                            }
                            className={`w-full rounded-lg border px-3 py-2 text-sm shadow-sm transition ${
                                filters.managerId === currentUserId
                                    ? "border-primary_green bg-brand_main text-white"
                                    : "border-brand_soft/60 text-gray-700 hover:bg-brand_soft/30"
                            }`}
                        >
                            Только мои
                        </button>
                    )}
                </div>
                <div className='sm:col-span-2'>
                    <label className='mb-1 block text-xs text-night_green/65'>Менеджер</label>
                    <SearchableSelect
                        value={filters.managerId}
                        onChange={id => setFilters(p => ({ ...p, managerId: id }))}
                        placeholder='Все'
                        emptyLabel='Сотрудник не найден'
                        options={managerOptions}
                    />
                </div>
            </div>

            {error && (
                <p className='rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700'>
                    {error}
                </p>
            )}

            {/* Мобильные карточки */}
            <div className='space-y-3 md:hidden'>
                {items === null && <CardListSkeleton />}
                {items?.length === 0 && (
                    <EmptyState
                        icon={LuGavel}
                        title='Аукционов не найдено'
                        hint='Попробуйте сбросить фильтры. Аукционы создаются из карточки проекта.'
                    />
                )}
                {items?.map(a => (
                    <MobileCard key={a.id} onClick={() => router.push(`/crm/auctions/${a.id}`)}>
                        <div className='flex items-start justify-between gap-2'>
                            <span className='font-medium text-night_green'>
                                {auctionDisplayTitle(a)}
                            </span>
                            <span
                                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${AUCTION_STATUS_COLORS[a.status]}`}
                            >
                                {AUCTION_STATUS_LABELS[a.status] || a.status}
                            </span>
                        </div>
                        <div className='mt-2 space-y-1'>
                            <CardRow label='Заказчик'>{a.customer?.name || "—"}</CardRow>
                            <CardRow label='Менеджер'>{managerName(a.manager)}</CardRow>
                            <CardRow label='Аукцион'>{fmtDate(a.auctionAt)}</CardRow>
                            <CardRow label='НМЦК'>
                                <span className='font-medium text-gray-800'>
                                    {formatMoney(a.nmck)}
                                </span>
                            </CardRow>
                        </div>
                    </MobileCard>
                ))}
                {items && items.length > 0 && (
                    <div className='flex items-center justify-between rounded-xl bg-gray-50 px-4 py-2 text-sm'>
                        <span className='text-xs font-semibold uppercase text-gray-500'>
                            Итого ({items.length})
                        </span>
                        <span className='font-semibold text-night_green'>
                            {formatMoney(total)}
                        </span>
                    </div>
                )}
            </div>

            <div className='hidden overflow-x-auto rounded-xl border border-brand_soft/40 bg-white/70 md:block'>
                <table className='w-full text-sm'>
                    <thead className='sticky top-0 z-10 bg-brand_soft/30 text-left text-xs uppercase tracking-wider text-night_green/70 backdrop-blur'>
                        <tr>
                            <th className='px-4 py-3'>Закупка</th>
                            <th className='px-4 py-3'>Заказчик</th>
                            <th className='px-4 py-3'>Менеджер</th>
                            <th className='px-4 py-3'>Статус</th>
                            <th className='px-4 py-3'>Аукцион</th>
                            <th className='px-4 py-3 text-right'>НМЦК</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items === null && <TableSkeleton rows={5} cols={6} />}
                        {items?.length === 0 && (
                            <EmptyState
                                colSpan={6}
                                icon={LuGavel}
                                title='Аукционов не найдено'
                                hint='Попробуйте сбросить фильтры. Аукционы создаются из карточки проекта.'
                            />
                        )}
                        {items?.map(a => (
                            <tr
                                key={a.id}
                                onClick={() => router.push(`/crm/auctions/${a.id}`)}
                                className='cursor-pointer border-t border-brand_soft/30 transition hover:bg-brand_soft/15'
                            >
                                <td className='px-4 py-3'>
                                    <Link
                                        href={`/crm/auctions/${a.id}`}
                                        className='font-medium text-night_green hover:text-brand_main'
                                    >
                                        {auctionDisplayTitle(a)}
                                    </Link>
                                </td>
                                <td className='px-4 py-3 text-gray-700'>
                                    {a.customer?.name || "—"}
                                </td>
                                <td className='px-4 py-3 text-gray-700'>
                                    {managerName(a.manager)}
                                </td>
                                <td className='px-4 py-3'>
                                    <span
                                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${AUCTION_STATUS_COLORS[a.status]}`}
                                    >
                                        {AUCTION_STATUS_LABELS[a.status] || a.status}
                                    </span>
                                </td>
                                <td className='px-4 py-3 text-gray-700'>
                                    {fmtDate(a.auctionAt)}
                                </td>
                                <td className='px-4 py-3 text-right font-medium text-gray-800'>
                                    {formatMoney(a.nmck)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    {items && items.length > 0 && (
                        <tfoot className='bg-gray-50'>
                            <tr>
                                <td
                                    colSpan={5}
                                    className='px-4 py-2 text-right text-xs font-semibold uppercase text-gray-500'
                                >
                                    Итого НМЦК по {items.length}{" "}
                                    {items.length === 1
                                        ? "аукциону"
                                        : items.length < 5
                                          ? "аукционам"
                                          : "аукционам"}
                                    :
                                </td>
                                <td className='px-4 py-2 text-right text-sm font-semibold text-night_green'>
                                    {formatMoney(total)}
                                </td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
        </div>
    )
}
