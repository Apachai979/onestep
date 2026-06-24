"use client"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { PROJECT_STATUS_LABELS, PROJECT_STATUSES, looksLikeUrl } from "@/lib/crm/project"
import { formatMoney } from "@/lib/crm/format"
import SearchableSelect from "./SearchableSelect"

const STATUS_CLASS = {
    IN_PROGRESS: "bg-blue-100 text-blue-800",
    COMPLETED: "bg-green-100 text-green-800",
    CANCELLED: "bg-gray-200 text-gray-700",
}

function fullName(u) {
    if (!u) return "—"
    return `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email
}

function formatDate(d) {
    if (!d) return "—"
    return new Date(d).toLocaleDateString("ru-RU")
}

export default function ProjectsList() {
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
            <div className='grid gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4'>
                <FilterField label='Поиск'>
                    <input
                        value={filters.q}
                        onChange={set("q")}
                        placeholder='Аукцион, название'
                        className='w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary_green focus:outline-none'
                    />
                </FilterField>
                <FilterField label='Статус'>
                    <select
                        value={filters.status}
                        onChange={set("status")}
                        className='w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary_green focus:outline-none'
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
                        className='w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary_green focus:outline-none'
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
                        className='w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary_green focus:outline-none'
                    />
                </FilterField>
                <FilterField label='Дата по'>
                    <input
                        type='date'
                        value={filters.dateTo}
                        onChange={set("dateTo")}
                        className='w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary_green focus:outline-none'
                    />
                </FilterField>
            </div>

            <div className='flex justify-end'>
                <Link
                    href='/crm/projects/new'
                    className='rounded-lg bg-primary_green px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-contrast_green'
                >
                    Новый проект
                </Link>
            </div>

            {error && <p className='text-sm text-red-600'>{error}</p>}

            <div className='overflow-x-auto rounded-xl border border-gray-200 bg-white'>
                <table className='w-full text-sm'>
                    <thead className='bg-gray-50 text-left text-xs uppercase text-gray-500'>
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
                        {items === null && (
                            <tr>
                                <td colSpan={10} className='px-4 py-6 text-center text-gray-400'>
                                    Загрузка...
                                </td>
                            </tr>
                        )}
                        {items?.length === 0 && (
                            <tr>
                                <td colSpan={10} className='px-4 py-6 text-center text-gray-400'>
                                    Проектов не найдено
                                </td>
                            </tr>
                        )}
                        {items?.map(p => (
                            <tr key={p.id} className='border-t border-gray-100 hover:bg-gray-50'>
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
                                            className='text-primary_green underline hover:text-contrast_green'
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
                                        className='font-medium text-night_green hover:text-primary_green'
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
