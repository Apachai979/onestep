"use client"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { LuBriefcase } from "react-icons/lu"
import {
    DEAL_STATUSES,
    DEAL_STATUS_COLORS,
    DEAL_STATUS_LABELS,
    dealDisplayTitle,
    dealDiscountedTotal,
} from "@/lib/crm/deal"
import { formatMoney } from "@/lib/crm/format"
import {
    Badge,
    CardListSkeleton,
    CardRow,
    DataTable,
    EmptyState,
    FilterBar,
    FilterMulti,
    FilterPicker,
    FilterSearch,
    FilterSelect,
    FilterToggle,
    MobileCard,
} from "@/components/crm/ui"

const EMPTY_FILTERS = {
    status: [],
    counterpartyId: "",
    managerId: "",
    isAuction: "",
    q: "",
}

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

function AuctionTag() {
    return (
        <span className='shrink-0 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700'>
            Аукцион
        </span>
    )
}

export default function DealsList({ currentUserId }) {
    const router = useRouter()
    const [items, setItems] = useState(null)
    const [error, setError] = useState("")
    const [filters, setFilters] = useState(EMPTY_FILTERS)
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
        if (filters.status.length) params.set("status", filters.status.join(","))
        if (filters.counterpartyId) params.set("counterpartyId", filters.counterpartyId)
        if (filters.managerId) params.set("managerId", filters.managerId)
        if (filters.isAuction) params.set("isAuction", filters.isAuction)
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

    // Статус — массив, сравниваем по строковому ключу, а не по ссылке.
    const statusKey = filters.status.join(",")

    // Строку поиска не дёргаем на каждый символ — ждём паузы в наборе.
    const [qDebounced, setQDebounced] = useState("")
    useEffect(() => {
        const t = setTimeout(() => setQDebounced(filters.q.trim()), 350)
        return () => clearTimeout(t)
    }, [filters.q])

    useEffect(() => {
        load()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statusKey, filters.counterpartyId, filters.managerId, filters.isAuction, qDebounced])

    // Поиск в счёт не идёт — у поля есть собственный крестик.
    const activeCount =
        filters.status.length +
        (filters.counterpartyId ? 1 : 0) +
        (filters.managerId ? 1 : 0) +
        (filters.isAuction ? 1 : 0)

    const statusOptions = useMemo(
        () => DEAL_STATUSES.map(s => ({ value: s, label: DEAL_STATUS_LABELS[s] })),
        [],
    )

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

    // Итог считаем по финальным суммам сделок — со скидкой.
    const total = items?.reduce((s, d) => s + dealDiscountedTotal(d), 0) ?? 0

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
                        className='inline-flex items-center gap-1.5 font-medium text-neutral-900 transition-colors hover:text-brand_main'
                    >
                        {d.isAuction && <AuctionTag />}
                        {dealDisplayTitle(d, d.counterparty?.name)}
                    </Link>
                ),
            },
            {
                key: "counterparty",
                header: "Клиент",
                sortable: true,
                sortValue: d => d.counterparty?.name || "",
                render: d => (
                    <span className='inline-flex flex-wrap items-center gap-1.5'>
                        {d.counterparty?.name || "—"}
                        {d.payer && (
                            <span
                                title={`Документы на «${d.payer.name}»`}
                                className='rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800'
                            >
                                платит {d.payer.name}
                            </span>
                        )}
                    </span>
                ),
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
                sortValue: d => dealDiscountedTotal(d),
                render: d => (
                    <span
                        className='font-medium text-neutral-900'
                        title={
                            Number(d.discount) > 0
                                ? `Сумма со скидкой ${Number(d.discount)}% (без скидки ${formatMoney(d.totalAmount)})`
                                : undefined
                        }
                    >
                        {formatMoney(dealDiscountedTotal(d))}
                    </span>
                ),
            },
        ],
        [],
    )

    return (
        <div className='space-y-4'>
            <FilterBar
                canReset={activeCount > 0}
                onReset={() => setFilters(EMPTY_FILTERS)}
            >
                <FilterSearch
                    value={filters.q}
                    onChange={q => setFilters(p => ({ ...p, q }))}
                    onEnter={load}
                    placeholder='Название сделки или клиента'
                />
                <FilterMulti
                    label='Статус'
                    value={filters.status}
                    onChange={status => setFilters(p => ({ ...p, status }))}
                    options={statusOptions}
                />
                <FilterPicker
                    label='Клиент'
                    value={filters.counterpartyId}
                    onChange={id => setFilters(p => ({ ...p, counterpartyId: id }))}
                    options={counterpartyOptions}
                    searchPlaceholder='Название или ИНН'
                    emptyLabel='Клиент не найден'
                />
                <FilterPicker
                    label='Менеджер'
                    value={filters.managerId}
                    onChange={id => setFilters(p => ({ ...p, managerId: id }))}
                    options={managerOptions}
                    searchPlaceholder='Имя или email'
                    emptyLabel='Сотрудник не найден'
                />
                <FilterSelect
                    label='Тип'
                    value={filters.isAuction}
                    onChange={v => setFilters(p => ({ ...p, isAuction: v }))}
                    options={[
                        { value: "true", label: "Только аукционы" },
                        { value: "false", label: "Без аукционов" },
                    ]}
                />
                {currentUserId && (
                    <FilterToggle
                        label='Только мои'
                        active={filters.managerId === currentUserId}
                        onChange={on =>
                            setFilters(p => ({ ...p, managerId: on ? currentUserId : "" }))
                        }
                    />
                )}
            </FilterBar>

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
                            <span className='flex min-w-0 items-center gap-1.5 font-medium text-neutral-900'>
                                {d.isAuction && <AuctionTag />}
                                <span className='min-w-0 truncate'>
                                    {dealDisplayTitle(d, d.counterparty?.name)}
                                </span>
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
                                    {formatMoney(dealDiscountedTotal(d))}
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
