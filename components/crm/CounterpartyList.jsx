"use client"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { LuPlus, LuUsers } from "react-icons/lu"
import { formatMoney, formatPercent } from "@/lib/crm/format"
import { COUNTERPARTY_PRIORITIES, COUNTERPARTY_PRIORITY_LABELS } from "@/lib/crm/counterparty"
import {
    Badge,
    Button,
    CardListSkeleton,
    CardRow,
    DataTable,
    EmptyState,
    FilterBar,
    FilterPicker,
    FilterSearch,
    FilterSelect,
    FilterText,
    MobileCard,
} from "@/components/crm/ui"
import PhoneLink from "./PhoneLink"

function counterpartyPhone(item) {
    return item.phone || item.contacts?.[0]?.phone || null
}

function fullName(u) {
    if (!u) return "—"
    return `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email
}

function primaryContactName(item) {
    const primary = item.contacts?.[0]
    if (!primary) return "—"
    return (
        `${primary.firstName ?? ""} ${primary.lastName ?? ""}`.trim() ||
        primary.email ||
        primary.phone ||
        "—"
    )
}

function safeJson(text) {
    try {
        return JSON.parse(text)
    } catch {
        return null
    }
}

// 1 — самый важный клиент, поэтому и цвет самый заметный.
const PRIORITY_TONES = { 1: "danger", 2: "warning", 3: "neutral" }

function PriorityBadge({ value }) {
    return <Badge tone={PRIORITY_TONES[value] || "neutral"}>{value}</Badge>
}

const PRIORITY_FILTER_OPTIONS = [
    ...COUNTERPARTY_PRIORITIES.map(v => ({
        value: String(v),
        label: COUNTERPARTY_PRIORITY_LABELS[v],
    })),
    { value: "none", label: "Не указан" },
]

export default function CounterpartyList({ type, newHref }) {
    const router = useRouter()
    // Приоритет — поле только конечных потребителей (см. TYPE_ONLY_FIELDS).
    const isEndCustomer = type === "END_CUSTOMER"
    const [items, setItems] = useState(null)
    const [error, setError] = useState("")
    const [q, setQ] = useState("")
    const [region, setRegion] = useState("")
    const [city, setCity] = useState("")
    const [managerId, setManagerId] = useState("")
    const [priority, setPriority] = useState("")
    const [managers, setManagers] = useState([])

    useEffect(() => {
        const controller = new AbortController()
        fetch("/api/crm/users", { signal: controller.signal })
            .then(r => (r.ok ? r.json() : { items: [] }))
            .then(d => setManagers(d.items || []))
            .catch(() => {})
        return () => controller.abort()
    }, [])

    // Запрос уходит после паузы в наборе, а не на каждый символ.
    const [applied, setApplied] = useState({
        q: "",
        region: "",
        city: "",
        managerId: "",
        priority: "",
    })
    useEffect(() => {
        const t = setTimeout(() => {
            const next = {
                q: q.trim(),
                region: region.trim(),
                city: city.trim(),
                managerId,
                priority,
            }
            // Тот же объект — React не перерисует и лишнего запроса не будет.
            setApplied(prev =>
                prev.q === next.q &&
                prev.region === next.region &&
                prev.city === next.city &&
                prev.managerId === next.managerId &&
                prev.priority === next.priority
                    ? prev
                    : next,
            )
        }, 300)
        return () => clearTimeout(t)
    }, [q, region, city, managerId, priority])

    useEffect(() => {
        const controller = new AbortController()
        const params = new URLSearchParams({ type })
        if (applied.q) params.set("q", applied.q)
        if (applied.region) params.set("region", applied.region)
        if (applied.city) params.set("city", applied.city)
        if (applied.managerId) params.set("managerId", applied.managerId)
        if (applied.priority) params.set("priority", applied.priority)

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
    }, [type, applied])

    const managerOptions = useMemo(
        () =>
            managers.map(m => ({
                id: m.id,
                label: fullName(m),
                search: `${m.firstName ?? ""} ${m.lastName ?? ""} ${m.email ?? ""}`,
            })),
        [managers],
    )

    const columns = useMemo(
        () => [
            {
                key: "name",
                header: "Название",
                sortable: true,
                sortValue: item => item.name,
                render: item => (
                    <Link
                        href={`/crm/counterparties/${item.id}`}
                        onClick={e => e.stopPropagation()}
                        className='font-medium text-neutral-900 hover:text-brand_main'
                    >
                        {item.name}
                    </Link>
                ),
            },
            {
                key: "region",
                header: "Регион",
                sortable: true,
                sortValue: item => item.region || "",
                render: item => item.region || "—",
            },
            {
                key: "city",
                header: "Город",
                sortable: true,
                sortValue: item => item.city || "",
                render: item => item.city || "—",
                hideable: true,
            },
            {
                key: "inn",
                header: "ИНН",
                render: item => item.inn || "—",
                hideable: true,
            },
            {
                key: "contact",
                header: "Контактное лицо",
                render: item => primaryContactName(item),
                hideable: true,
            },
            ...(isEndCustomer
                ? [
                      {
                          key: "priority",
                          header: "Приоритет",
                          align: "center",
                          sortable: true,
                          // Карточки без приоритета — в конец при сортировке
                          // по возрастанию, чтобы важные оказались наверху.
                          sortValue: item => item.priority ?? Number.MAX_SAFE_INTEGER,
                          render: item =>
                              item.priority ? (
                                  <PriorityBadge value={item.priority} />
                              ) : (
                                  "—"
                              ),
                      },
                  ]
                : []),
            {
                key: "manager",
                header: "Ответственный",
                sortable: true,
                sortValue: item => (item.manager ? fullName(item.manager) : ""),
                render: item => fullName(item.manager),
                hideable: true,
            },
            {
                key: "phone",
                header: "Телефон",
                render: item =>
                    counterpartyPhone(item) ? (
                        <PhoneLink phone={counterpartyPhone(item)} />
                    ) : (
                        "—"
                    ),
                hideable: true,
            },
            {
                key: "budget",
                header: "Бюджет",
                align: "right",
                sortable: true,
                sortValue: item => Number(item.totalRevenue || 0),
                render: item => formatMoney(item.totalRevenue),
            },
            {
                key: "closedRevenue",
                header: "Оборот",
                align: "right",
                sortable: true,
                sortValue: item => Number(item.closedRevenue || 0),
                render: item => formatMoney(item.closedRevenue),
            },
            {
                key: "discount",
                header: "Скидка",
                align: "right",
                render: item => formatPercent(item.discount),
            },
        ],
        [isEndCustomer],
    )

    return (
        <div className='space-y-4'>
            <FilterBar
                canReset={Boolean(q || region || city || managerId || priority)}
                onReset={() => {
                    setQ("")
                    setRegion("")
                    setCity("")
                    setManagerId("")
                    setPriority("")
                }}
                actions={
                    <Button href={newHref} size='sm'>
                        <LuPlus className='h-4 w-4' />
                        Добавить
                    </Button>
                }
            >
                <FilterSearch
                    value={q}
                    onChange={setQ}
                    placeholder='Название, ИНН, контактное лицо'
                />
                <FilterText
                    label='Регион'
                    value={region}
                    onChange={setRegion}
                    placeholder='Например, Московская'
                />
                <FilterText
                    label='Город'
                    value={city}
                    onChange={setCity}
                    placeholder='Например, Москва'
                />
                {isEndCustomer && (
                    <FilterSelect
                        label='Приоритет'
                        value={priority}
                        onChange={setPriority}
                        options={PRIORITY_FILTER_OPTIONS}
                    />
                )}
                <FilterPicker
                    label='Ответственный'
                    value={managerId}
                    onChange={setManagerId}
                    options={managerOptions}
                    searchPlaceholder='Имя или email'
                    emptyLabel='Сотрудник не найден'
                />
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
                        icon={LuUsers}
                        title='Записей не найдено'
                        hint='Попробуйте изменить запрос или сбросить фильтры.'
                    />
                )}
                {items?.map(item => (
                    <MobileCard
                        key={item.id}
                        onClick={() => router.push(`/crm/counterparties/${item.id}`)}
                    >
                        <div className='flex items-start justify-between gap-2'>
                            <span className='font-medium text-neutral-900'>{item.name}</span>
                            <span className='min-w-0 max-w-[45%] truncate text-right text-xs text-neutral-500'>
                                {item.region}
                            </span>
                        </div>
                        <div className='mt-2 space-y-1'>
                            <CardRow label='Город'>{item.city || "—"}</CardRow>
                            <CardRow label='ИНН'>{item.inn || "—"}</CardRow>
                            {isEndCustomer && (
                                <CardRow label='Приоритет'>
                                    {item.priority ? (
                                        <PriorityBadge value={item.priority} />
                                    ) : (
                                        "—"
                                    )}
                                </CardRow>
                            )}
                            <CardRow label='Контакт'>{primaryContactName(item)}</CardRow>
                            <CardRow label='Ответственный'>{fullName(item.manager)}</CardRow>
                            <CardRow label='Телефон'>
                                {counterpartyPhone(item) ? (
                                    <PhoneLink phone={counterpartyPhone(item)} />
                                ) : (
                                    "—"
                                )}
                            </CardRow>
                            <CardRow label='Бюджет'>{formatMoney(item.totalRevenue)}</CardRow>
                            <CardRow label='Оборот'>{formatMoney(item.closedRevenue)}</CardRow>
                            <CardRow label='Скидка'>{formatPercent(item.discount)}</CardRow>
                        </div>
                    </MobileCard>
                ))}
            </div>

            <div className='hidden md:block'>
                <DataTable
                    columns={columns}
                    rows={items || []}
                    loading={items === null}
                    getRowId={item => item.id}
                    onRowClick={item => router.push(`/crm/counterparties/${item.id}`)}
                    initialSort={{ key: "name", dir: "asc" }}
                    empty={
                        <EmptyState
                            icon={LuUsers}
                            title='Записей не найдено'
                            hint='Попробуйте изменить запрос или сбросить фильтры.'
                        />
                    }
                />
            </div>
        </div>
    )
}
