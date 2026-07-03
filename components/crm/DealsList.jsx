"use client"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { LuBriefcase, LuSearch } from "react-icons/lu"
import {
    DEAL_STATUSES,
    DEAL_STATUS_COLORS,
    DEAL_STATUS_LABELS,
    dealDisplayTitle,
} from "@/lib/crm/deal"
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

export default function DealsList({ currentUserId }) {
    const router = useRouter()
    const [items, setItems] = useState(null)
    const [error, setError] = useState("")
    const [filters, setFilters] = useState({
        status: "",
        counterpartyId: "",
        managerId: "",
        q: "",
    })
    const [counterparties, setCounterparties] = useState([])
    const [managers, setManagers] = useState([])

    useEffect(() => {
        Promise.all([
            fetch("/api/crm/counterparties")
                .then(r => (r.ok ? r.json() : { items: [] }))
                .catch(() => ({ items: [] })),
            fetch("/api/crm/users")
                .then(r => (r.ok ? r.json() : { items: [] }))
                .catch(() => ({ items: [] })),
        ]).then(([c, u]) => {
            setCounterparties(c.items || [])
            setManagers(u.items || [])
        })
    }, [])

    async function load() {
        setError("")
        const params = new URLSearchParams()
        if (filters.status) params.set("status", filters.status)
        if (filters.counterpartyId) params.set("counterpartyId", filters.counterpartyId)
        if (filters.managerId) params.set("managerId", filters.managerId)
        if (filters.q.trim()) params.set("q", filters.q.trim())
        const r = await fetch(`/api/crm/deals?${params.toString()}`)
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
    }, [filters.status, filters.counterpartyId, filters.managerId])

    const counterpartyOptions = useMemo(
        () =>
            counterparties.map(c => ({
                id: c.id,
                label: c.name,
                sublabel: c.type === "DISTRIBUTOR" ? "Дистрибьютор" : "Конечный потребитель",
                search: `${c.name} ${c.inn ?? ""} ${c.region ?? ""}`,
            })),
        [counterparties],
    )

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

    const total = items?.reduce((s, d) => s + Number(d.totalAmount || 0), 0) ?? 0

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
                            placeholder='Название сделки или клиента'
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
                        {DEAL_STATUSES.map(s => (
                            <option key={s} value={s}>
                                {DEAL_STATUS_LABELS[s]}
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
                    <label className='mb-1 block text-xs text-night_green/65'>Клиент</label>
                    <SearchableSelect
                        value={filters.counterpartyId}
                        onChange={id => setFilters(p => ({ ...p, counterpartyId: id }))}
                        placeholder='Все'
                        emptyLabel='Клиент не найден'
                        options={counterpartyOptions}
                    />
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
                        icon={LuBriefcase}
                        title='Сделок не найдено'
                        hint='Попробуйте сбросить фильтры или создайте новую сделку.'
                    />
                )}
                {items?.map(d => (
                    <MobileCard key={d.id} onClick={() => router.push(`/crm/deals/${d.id}`)}>
                        <div className='flex items-start justify-between gap-2'>
                            <span className='font-medium text-night_green'>
                                {dealDisplayTitle(d, d.counterparty?.name)}
                            </span>
                            <span
                                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${DEAL_STATUS_COLORS[d.status]}`}
                            >
                                {DEAL_STATUS_LABELS[d.status] || d.status}
                            </span>
                        </div>
                        <div className='mt-2 space-y-1'>
                            <CardRow label='Клиент'>{d.counterparty?.name || "—"}</CardRow>
                            <CardRow label='Менеджер'>{managerName(d.manager)}</CardRow>
                            <CardRow label='Создана'>{fmtDate(d.createdAt)}</CardRow>
                            <CardRow label='Сумма'>
                                <span className='font-medium text-gray-800'>
                                    {formatMoney(d.totalAmount)}
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
                            <th className='px-4 py-3'>Название</th>
                            <th className='px-4 py-3'>Клиент</th>
                            <th className='px-4 py-3'>Менеджер</th>
                            <th className='px-4 py-3'>Статус</th>
                            <th className='px-4 py-3'>Создана</th>
                            <th className='px-4 py-3 text-right'>Сумма</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items === null && <TableSkeleton rows={5} cols={6} />}
                        {items?.length === 0 && (
                            <EmptyState
                                colSpan={6}
                                icon={LuBriefcase}
                                title='Сделок не найдено'
                                hint='Попробуйте сбросить фильтры или создайте новую сделку.'
                            />
                        )}
                        {items?.map(d => (
                            <tr
                                key={d.id}
                                onClick={() => router.push(`/crm/deals/${d.id}`)}
                                className='cursor-pointer border-t border-brand_soft/30 transition hover:bg-brand_soft/15'
                            >
                                <td className='px-4 py-3'>
                                    <Link
                                        href={`/crm/deals/${d.id}`}
                                        className='font-medium text-night_green hover:text-brand_main'
                                    >
                                        {dealDisplayTitle(d, d.counterparty?.name)}
                                    </Link>
                                </td>
                                <td className='px-4 py-3 text-gray-700'>
                                    {d.counterparty?.name || "—"}
                                </td>
                                <td className='px-4 py-3 text-gray-700'>
                                    {managerName(d.manager)}
                                </td>
                                <td className='px-4 py-3'>
                                    <span
                                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${DEAL_STATUS_COLORS[d.status]}`}
                                    >
                                        {DEAL_STATUS_LABELS[d.status] || d.status}
                                    </span>
                                </td>
                                <td className='px-4 py-3 text-gray-700'>
                                    {fmtDate(d.createdAt)}
                                </td>
                                <td className='px-4 py-3 text-right font-medium text-gray-800'>
                                    {formatMoney(d.totalAmount)}
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
                                    Итого по {items.length}{" "}
                                    {items.length === 1
                                        ? "сделке"
                                        : items.length < 5
                                          ? "сделкам"
                                          : "сделок"}
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
