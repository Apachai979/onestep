"use client"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import {
    PROJECT_STATUS_COLORS,
    PROJECT_STATUS_LABELS,
    PROJECT_STATUSES,
    looksLikeUrl,
} from "@/lib/crm/project"
import { LuTarget, LuPlus } from "react-icons/lu"
import { formatMoney } from "@/lib/crm/format"
import SearchableSelect from "./SearchableSelect"
import { CardListSkeleton, CardRow, EmptyState, MobileCard, TableSkeleton } from "@/components/crm/ui"

const STATUS_CLASS = PROJECT_STATUS_COLORS

function fullName(u) {
    if (!u) return "—"
    return `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email
}

function formatDate(d) {
    if (!d) return "—"
    return new Date(d).toLocaleDateString("ru-RU")
}

export default function ProjectsList() {
    const router = useRouter()
    const [items, setItems] = useState(null)
    const [error, setError] = useState("")
    const [filters, setFilters] = useState({
        q: "",
        status: "",
        region: "",
        dateFrom: "",
        dateTo: "",
        distributorId: "",
        customerId: "",
        managerId: "",
    })
    const [refs, setRefs] = useState({ distributors: [], customers: [], managers: [] })

    useEffect(() => {
        Promise.all([
            fetch("/api/crm/counterparties?type=DISTRIBUTOR").then(r => r.json()),
            fetch("/api/crm/counterparties?type=END_CUSTOMER").then(r => r.json()),
            fetch("/api/crm/users").then(r => r.json()),
        ]).then(([d, c, u]) =>
            setRefs({
                distributors: d.items || [],
                customers: c.items || [],
                managers: u.items || [],
            }),
        )
    }, [])

    useEffect(() => {
        const controller = new AbortController()
        const params = new URLSearchParams()
        for (const [k, v] of Object.entries(filters)) {
            if (v) params.set(k, v)
        }

        setError("")
        fetch(`/api/crm/projects?${params.toString()}`, { signal: controller.signal })
            .then(async r => {
                if (!r.ok) throw new Error((await r.json()).error || "Ошибка загрузки")
                return r.json()
            })
            .then(d => setItems(d.items))
            .catch(err => {
                if (err.name === "AbortError") return
                setError(err.message)
                setItems([])
            })

        return () => controller.abort()
    }, [filters])

    function set(field) {
        return e => setFilters(prev => ({ ...prev, [field]: e.target.value }))
    }

    function setId(field) {
        return id => setFilters(prev => ({ ...prev, [field]: id }))
    }

    const distributorOptions = useMemo(
        () =>
            refs.distributors.map(c => ({
                id: c.id,
                label: c.name,
                sublabel: `${c.inn ? `ИНН ${c.inn}` : ""}${
                    c.inn && c.region ? " · " : ""
                }${c.region ?? ""}`,
                search: `${c.name} ${c.inn ?? ""} ${c.region ?? ""}`,
            })),
        [refs.distributors],
    )

    const customerOptions = useMemo(
        () =>
            refs.customers.map(c => ({
                id: c.id,
                label: c.name,
                sublabel: `${c.inn ? `ИНН ${c.inn}` : ""}${
                    c.inn && c.region ? " · " : ""
                }${c.region ?? ""}`,
                search: `${c.name} ${c.inn ?? ""} ${c.region ?? ""}`,
            })),
        [refs.customers],
    )

    const managerOptions = useMemo(
        () =>
            refs.managers.map(m => ({
                id: m.id,
                label: fullName(m),
                search: `${m.firstName ?? ""} ${m.lastName ?? ""} ${m.email ?? ""}`,
            })),
        [refs.managers],
    )

    return (
        <div className='space-y-4'>
            <div className='grid gap-3 rounded-xl border border-brand_soft/40 bg-white/70 p-4 sm:grid-cols-2 lg:grid-cols-4'>
                <FilterField label='Поиск'>
                    <input
                        value={filters.q}
                        onChange={set("q")}
                        placeholder='Аукцион, название'
                        className='w-full rounded-lg border border-brand_soft/60 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand_main focus:outline-none'
                    />
                </FilterField>
                <FilterField label='Статус'>
                    <select
                        value={filters.status}
                        onChange={set("status")}
                        className='w-full rounded-lg border border-brand_soft/60 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand_main focus:outline-none'
                    >
                        <option value=''>Все</option>
                        {PROJECT_STATUSES.map(s => (
                            <option key={s} value={s}>
                                {PROJECT_STATUS_LABELS[s]}
                            </option>
                        ))}
                    </select>
                </FilterField>
                <FilterField label='Регион'>
                    <input
                        value={filters.region}
                        onChange={set("region")}
                        className='w-full rounded-lg border border-brand_soft/60 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand_main focus:outline-none'
                    />
                </FilterField>
                <FilterField label='Менеджер'>
                    <SearchableSelect
                        value={filters.managerId}
                        onChange={setId("managerId")}
                        options={managerOptions}
                        placeholder='Все'
                    />
                </FilterField>
                <FilterField label='Дистрибьютор'>
                    <SearchableSelect
                        value={filters.distributorId}
                        onChange={setId("distributorId")}
                        options={distributorOptions}
                        placeholder='Все'
                    />
                </FilterField>
                <FilterField label='Конечный потребитель'>
                    <SearchableSelect
                        value={filters.customerId}
                        onChange={setId("customerId")}
                        options={customerOptions}
                        placeholder='Все'
                    />
                </FilterField>
                <FilterField label='Дата с'>
                    <input
                        type='date'
                        value={filters.dateFrom}
                        onChange={set("dateFrom")}
                        className='w-full rounded-lg border border-brand_soft/60 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand_main focus:outline-none'
                    />
                </FilterField>
                <FilterField label='Дата по'>
                    <input
                        type='date'
                        value={filters.dateTo}
                        onChange={set("dateTo")}
                        className='w-full rounded-lg border border-brand_soft/60 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand_main focus:outline-none'
                    />
                </FilterField>
            </div>

            <div className='flex justify-end'>
                <Link
                    href='/crm/projects/new'
                    className='inline-flex items-center gap-2 rounded-lg bg-brand_main px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand_main/90'
                >
                    <LuPlus className='h-4 w-4' />
                    Новый проект
                </Link>
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
                        icon={LuTarget}
                        title='Проектов не найдено'
                        hint='Попробуйте сбросить фильтры или создайте новый проект.'
                    />
                )}
                {items?.map(p => (
                    <MobileCard key={p.id} onClick={() => router.push(`/crm/projects/${p.id}`)}>
                        <div className='flex items-start justify-between gap-2'>
                            <span className='font-medium text-night_green'>{p.internalName}</span>
                            <span
                                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[p.status] || ""}`}
                            >
                                {PROJECT_STATUS_LABELS[p.status]}
                            </span>
                        </div>
                        <div className='mt-2 space-y-1'>
                            <CardRow label='Потребитель'>{p.endCustomer?.name || "—"}</CardRow>
                            <CardRow label='Дистрибьютор'>{p.distributor?.name || "—"}</CardRow>
                            <CardRow label='Регион'>
                                {p.endCustomer?.region || p.distributor?.region || "—"}
                            </CardRow>
                            <CardRow label='Менеджер'>{fullName(p.manager)}</CardRow>
                            <CardRow label='Аукцион'>
                                {looksLikeUrl(p.externalAuctionId) ? (
                                    <a
                                        href={p.externalAuctionId}
                                        target='_blank'
                                        rel='noopener noreferrer'
                                        onClick={e => e.stopPropagation()}
                                        className='text-brand_main underline hover:text-brand_main/80'
                                    >
                                        ссылка
                                    </a>
                                ) : (
                                    p.externalAuctionId || "—"
                                )}
                            </CardRow>
                            <CardRow label='Дата аукциона'>{formatDate(p.auctionDate)}</CardRow>
                            <CardRow label='Сумма'>
                                <span className='font-medium text-gray-800'>
                                    {formatMoney(p.totalAmount)}
                                </span>
                            </CardRow>
                        </div>
                    </MobileCard>
                ))}
            </div>

            <div className='hidden overflow-x-auto rounded-xl border border-brand_soft/40 bg-white/70 md:block'>
                <table className='w-full text-sm'>
                    <thead className='sticky top-0 z-10 bg-brand_soft/30 text-left text-xs uppercase tracking-wider text-night_green/70 backdrop-blur'>
                        <tr>
                            <th className='px-4 py-3'>Конечный потребитель</th>
                            <th className='px-4 py-3'>Аукцион</th>
                            <th className='px-4 py-3'>Внутреннее название</th>
                            <th className='px-4 py-3'>Дистрибьютор</th>
                            <th className='px-4 py-3'>Регион</th>
                            <th className='px-4 py-3'>Менеджер</th>
                            <th className='px-4 py-3'>Статус</th>
                            <th className='px-4 py-3 text-right'>Сумма</th>
                            <th className='px-4 py-3'>Создан</th>
                            <th className='px-4 py-3'>Аукцион</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items === null && <TableSkeleton rows={5} cols={10} />}
                        {items?.length === 0 && (
                            <EmptyState
                                colSpan={10}
                                icon={LuTarget}
                                title='Проектов не найдено'
                                hint='Попробуйте сбросить фильтры или создайте новый проект.'
                            />
                        )}
                        {items?.map(p => (
                            <tr
                                key={p.id}
                                onClick={() => router.push(`/crm/projects/${p.id}`)}
                                className='cursor-pointer border-t border-brand_soft/30 transition hover:bg-brand_soft/15'
                            >
                                <td className='px-4 py-3 text-gray-700'>
                                    {p.endCustomer?.name || "—"}
                                </td>
                                <td className='max-w-[220px] truncate px-4 py-3 text-gray-700'>
                                    {looksLikeUrl(p.externalAuctionId) ? (
                                        <a
                                            href={p.externalAuctionId}
                                            target='_blank'
                                            rel='noopener noreferrer'
                                            onClick={e => e.stopPropagation()}
                                            className='text-brand_main underline hover:text-brand_main/80'
                                        >
                                            {p.externalAuctionId}
                                        </a>
                                    ) : (
                                        p.externalAuctionId
                                    )}
                                </td>
                                <td className='px-4 py-3'>
                                    <Link
                                        href={`/crm/projects/${p.id}`}
                                        className='font-medium text-night_green hover:text-brand_main'
                                    >
                                        {p.internalName}
                                    </Link>
                                </td>
                                <td className='px-4 py-3 text-gray-700'>
                                    {p.distributor?.name || "—"}
                                </td>
                                <td className='px-4 py-3 text-gray-700'>
                                    {p.endCustomer?.region || p.distributor?.region || "—"}
                                </td>
                                <td className='px-4 py-3 text-gray-700'>{fullName(p.manager)}</td>
                                <td className='px-4 py-3'>
                                    <span
                                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[p.status] || ""}`}
                                    >
                                        {PROJECT_STATUS_LABELS[p.status]}
                                    </span>
                                </td>
                                <td className='px-4 py-3 text-right text-gray-700'>
                                    {formatMoney(p.totalAmount)}
                                </td>
                                <td className='px-4 py-3 text-gray-700'>
                                    {formatDate(p.createdAt)}
                                </td>
                                <td className='px-4 py-3 text-gray-700'>
                                    {formatDate(p.auctionDate)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

function FilterField({ label, children }) {
    return (
        <div>
            <label className='mb-1 block text-xs text-gray-600'>{label}</label>
            {children}
        </div>
    )
}
