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

    const columns = useMemo(
        () => [
            {
                key: "title",
                header: "Закупка",
                sortable: true,
                sortValue: a => auctionDisplayTitle(a),
                render: a => (
                    <Link
                        href={`/crm/auctions/${a.id}`}
                        onClick={e => e.stopPropagation()}
                        className='font-medium text-neutral-900 hover:text-brand_main'
                    >
                        {auctionDisplayTitle(a)}
                    </Link>
                ),
            },
            {
                key: "customer",
                header: "Заказчик",
                sortable: true,
                sortValue: a => a.customer?.name || "",
                render: a => a.customer?.name || "—",
            },
            {
                key: "manager",
                header: "Менеджер",
                sortValue: a => managerName(a.manager),
                render: a => managerName(a.manager),
                hideable: true,
            },
            {
                key: "status",
                header: "Статус",
                sortable: true,
                sortValue: a => AUCTION_STATUS_LABELS[a.status] || a.status,
                render: a => (
                    <Badge className={AUCTION_STATUS_COLORS[a.status]}>
                        {AUCTION_STATUS_LABELS[a.status] || a.status}
                    </Badge>
                ),
            },
            {
                key: "auctionAt",
                header: "Аукцион",
                sortable: true,
                sortValue: a => (a.auctionAt ? new Date(a.auctionAt).getTime() : 0),
                render: a => fmtDate(a.auctionAt),
                hideable: true,
            },
            {
                key: "nmck",
                header: "НМЦК",
                align: "right",
                sortable: true,
                sortValue: a => Number(a.nmck || 0),
                render: a => (
                    <span className='font-medium text-neutral-900'>{formatMoney(a.nmck)}</span>
                ),
            },
        ],
        [],
    )

    return (
        <div className='space-y-4'>
            <div className='grid gap-3 rounded-2xl border border-line bg-white p-4 shadow-sm sm:grid-cols-4'>
                <div className='sm:col-span-2'>
                    <Field label='Поиск'>
                        <Input
                            icon={LuSearch}
                            value={filters.q}
                            onChange={e => setFilters(p => ({ ...p, q: e.target.value }))}
                            onKeyDown={e => e.key === "Enter" && load()}
                            placeholder='Номер закупки, заказчик или поставщик'
                        />
                    </Field>
                </div>
                <Field label='Статус'>
                    <Select
                        value={filters.status}
                        onChange={e => setFilters(p => ({ ...p, status: e.target.value }))}
                    >
                        <option value=''>Все</option>
                        {AUCTION_STATUSES.map(s => (
                            <option key={s} value={s}>
                                {AUCTION_STATUS_LABELS[s]}
                            </option>
                        ))}
                    </Select>
                </Field>
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
                        icon={LuGavel}
                        title='Аукционов не найдено'
                        hint='Попробуйте сбросить фильтры. Аукционы создаются из карточки проекта.'
                    />
                )}
                {items?.map(a => (
                    <MobileCard key={a.id} onClick={() => router.push(`/crm/auctions/${a.id}`)}>
                        <div className='flex items-start justify-between gap-2'>
                            <span className='font-medium text-neutral-900'>
                                {auctionDisplayTitle(a)}
                            </span>
                            <Badge className={AUCTION_STATUS_COLORS[a.status]}>
                                {AUCTION_STATUS_LABELS[a.status] || a.status}
                            </Badge>
                        </div>
                        <div className='mt-2 space-y-1'>
                            <CardRow label='Заказчик'>{a.customer?.name || "—"}</CardRow>
                            <CardRow label='Менеджер'>{managerName(a.manager)}</CardRow>
                            <CardRow label='Аукцион'>{fmtDate(a.auctionAt)}</CardRow>
                            <CardRow label='НМЦК'>
                                <span className='font-medium text-neutral-900'>
                                    {formatMoney(a.nmck)}
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

            <div className='hidden md:block'>
                <DataTable
                    columns={columns}
                    rows={items || []}
                    loading={items === null}
                    getRowId={a => a.id}
                    onRowClick={a => router.push(`/crm/auctions/${a.id}`)}
                    initialSort={{ key: "auctionAt", dir: "desc" }}
                    empty={
                        <EmptyState
                            icon={LuGavel}
                            title='Аукционов не найдено'
                            hint='Попробуйте сбросить фильтры. Аукционы создаются из карточки проекта.'
                        />
                    }
                />
                {items && items.length > 0 && (
                    <div className='mt-3 flex items-center justify-end gap-3 px-1 text-sm'>
                        <span className='text-xs font-semibold uppercase text-neutral-500'>
                            Итого НМЦК по {items.length} аукционам
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
