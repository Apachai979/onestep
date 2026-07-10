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
import {
    Badge,
    Button,
    CardListSkeleton,
    CardRow,
    DataTable,
    EmptyState,
    Field,
    Input,
    MobileCard,
    Select,
} from "@/components/crm/ui"

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

    const columns = useMemo(
        () => [
            {
                key: "title",
                header: "Название",
                sortable: true,
                sortValue: d => dealDisplayTitle(d, d.counterparty?.name),
                render: d => (
                    <Link
                        href={`/crm/deals/${d.id}`}
                        onClick={e => e.stopPropagation()}
                        className='font-medium text-neutral-900 transition-colors hover:text-brand_main'
                    >
                        {dealDisplayTitle(d, d.counterparty?.name)}
                    </Link>
                ),
            },
            {
                key: "counterparty",
                header: "Клиент",
                sortable: true,
                sortValue: d => d.counterparty?.name || "",
                render: d => d.counterparty?.name || "—",
            },
            {
                key: "manager",
                header: "Менеджер",
                sortable: true,
                sortValue: d => managerName(d.manager),
                render: d => managerName(d.manager),
                hideable: true,
            },
            {
                key: "status",
                header: "Статус",
                sortable: true,
                sortValue: d => DEAL_STATUS_LABELS[d.status] || d.status,
                render: d => (
                    <Badge className={DEAL_STATUS_COLORS[d.status]}>
                        {DEAL_STATUS_LABELS[d.status] || d.status}
                    </Badge>
                ),
            },
            {
                key: "createdAt",
                header: "Создана",
                sortable: true,
                sortValue: d => new Date(d.createdAt).getTime(),
                render: d => fmtDate(d.createdAt),
                hideable: true,
            },
            {
                key: "totalAmount",
                header: "Сумма",
                align: "right",
                sortable: true,
                sortValue: d => Number(d.totalAmount || 0),
                render: d => (
                    <span className='font-medium text-neutral-900'>
                        {formatMoney(d.totalAmount)}
                    </span>
                ),
            },
        ],
        [],
    )

    return (
        <div className='space-y-4'>
            {/* Фильтры */}
            <div className='grid gap-3 rounded-2xl border border-line bg-white p-4 shadow-sm sm:grid-cols-4'>
                <div className='sm:col-span-2'>
                    <Field label='Поиск'>
                        <Input
                            icon={LuSearch}
                            value={filters.q}
                            onChange={e => setFilters(p => ({ ...p, q: e.target.value }))}
                            onKeyDown={e => e.key === "Enter" && load()}
                            placeholder='Название сделки или клиента'
                        />
                    </Field>
                </div>
                <Select
                    label='Статус'
                    value={filters.status}
                    onChange={e => setFilters(p => ({ ...p, status: e.target.value }))}
                >
                    <option value=''>Все</option>
                    {DEAL_STATUSES.map(s => (
                        <option key={s} value={s}>
                            {DEAL_STATUS_LABELS[s]}
                        </option>
                    ))}
                </Select>
                <div className='flex items-end'>
                    {currentUserId && (
                        <Button
                            type='button'
                            variant={filters.managerId === currentUserId ? "primary" : "secondary"}
                            className='w-full'
                            onClick={() =>
                                setFilters(p => ({
                                    ...p,
                                    managerId:
                                        p.managerId === currentUserId ? "" : currentUserId,
                                }))
                            }
                        >
                            Только мои
                        </Button>
                    )}
                </div>
                <div className='sm:col-span-2'>
                    <Field label='Клиент'>
                        <SearchableSelect
                            value={filters.counterpartyId}
                            onChange={id => setFilters(p => ({ ...p, counterpartyId: id }))}
                            placeholder='Все'
                            emptyLabel='Клиент не найден'
                            options={counterpartyOptions}
                        />
                    </Field>
                </div>
                <div className='sm:col-span-2'>
                    <Field label='Менеджер'>
                        <SearchableSelect
                            value={filters.managerId}
                            onChange={id => setFilters(p => ({ ...p, managerId: id }))}
                            placeholder='Все'
                            emptyLabel='Сотрудник не найден'
                            options={managerOptions}
                        />
                    </Field>
                </div>
            </div>

            {error && (
                <p className='rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700'>
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
                            <span className='font-medium text-neutral-900'>
                                {dealDisplayTitle(d, d.counterparty?.name)}
                            </span>
                            <Badge className={DEAL_STATUS_COLORS[d.status]}>
                                {DEAL_STATUS_LABELS[d.status] || d.status}
                            </Badge>
                        </div>
                        <div className='mt-2 space-y-1'>
                            <CardRow label='Клиент'>{d.counterparty?.name || "—"}</CardRow>
                            <CardRow label='Менеджер'>{managerName(d.manager)}</CardRow>
                            <CardRow label='Создана'>{fmtDate(d.createdAt)}</CardRow>
                            <CardRow label='Сумма'>
                                <span className='font-medium text-neutral-900'>
                                    {formatMoney(d.totalAmount)}
                                </span>
                            </CardRow>
                        </div>
                    </MobileCard>
                ))}
                {items && items.length > 0 && (
                    <div className='flex items-center justify-between rounded-xl bg-surface_muted px-4 py-2 text-sm'>
                        <span className='text-xs font-semibold uppercase text-neutral-500'>
                            Итого ({items.length})
                        </span>
                        <span className='font-semibold text-neutral-900'>
                            {formatMoney(total)}
                        </span>
                    </div>
                )}
            </div>

            {/* Таблица (desktop) */}
            <div className='hidden md:block'>
                <DataTable
                    columns={columns}
                    rows={items || []}
                    loading={items === null}
                    getRowId={d => d.id}
                    onRowClick={d => router.push(`/crm/deals/${d.id}`)}
                    initialSort={{ key: "createdAt", dir: "desc" }}
                    pageSize={25}
                    empty={
                        <EmptyState
                            icon={LuBriefcase}
                            title='Сделок не найдено'
                            hint='Попробуйте сбросить фильтры или создайте новую сделку.'
                        />
                    }
                />
                {items && items.length > 0 && (
                    <div className='mt-3 flex items-center justify-end gap-3 px-1 text-sm'>
                        <span className='text-xs font-semibold uppercase text-neutral-500'>
                            Итого по {items.length}{" "}
                            {items.length === 1
                                ? "сделке"
                                : items.length < 5
                                  ? "сделкам"
                                  : "сделок"}
                        </span>
                        <span className='font-semibold text-neutral-900'>
                            {formatMoney(total)}
                        </span>
                    </div>
                )}
            </div>
        </div>
    )
}
