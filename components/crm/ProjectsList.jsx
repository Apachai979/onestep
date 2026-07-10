"use client"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import {
    PROJECT_STATUS_COLORS,
    PROJECT_STATUS_LABELS,
    PROJECT_STATUSES,
} from "@/lib/crm/project"
import { LuTarget, LuPlus } from "react-icons/lu"
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

    const columns = useMemo(
        () => [
            {
                key: "endCustomer",
                header: "Конечный потребитель",
                sortable: true,
                sortValue: p => p.endCustomer?.name || "",
                render: p => p.endCustomer?.name || "—",
            },
            {
                key: "internalName",
                header: "Внутреннее название",
                sortable: true,
                sortValue: p => p.internalName,
                render: p => (
                    <Link
                        href={`/crm/projects/${p.id}`}
                        onClick={e => e.stopPropagation()}
                        className='font-medium text-neutral-900 hover:text-brand_main'
                    >
                        {p.internalName}
                    </Link>
                ),
            },
            {
                key: "distributor",
                header: "Дистрибьютор",
                sortValue: p => p.distributor?.name || "",
                render: p => p.distributor?.name || "—",
                hideable: true,
            },
            {
                key: "region",
                header: "Регион",
                render: p => p.endCustomer?.region || p.distributor?.region || "—",
                hideable: true,
            },
            {
                key: "manager",
                header: "Менеджер",
                sortValue: p => fullName(p.manager),
                render: p => fullName(p.manager),
                hideable: true,
            },
            {
                key: "status",
                header: "Статус",
                sortable: true,
                sortValue: p => PROJECT_STATUS_LABELS[p.status] || p.status,
                render: p => (
                    <Badge className={STATUS_CLASS[p.status] || ""}>
                        {PROJECT_STATUS_LABELS[p.status]}
                    </Badge>
                ),
            },
            {
                key: "totalAmount",
                header: "Сумма сделок",
                align: "right",
                sortable: true,
                sortValue: p => Number(p.totalAmount || 0),
                render: p => formatMoney(p.totalAmount),
            },
            {
                key: "createdAt",
                header: "Создан",
                sortable: true,
                sortValue: p => new Date(p.createdAt).getTime(),
                render: p => formatDate(p.createdAt),
                hideable: true,
            },
        ],
        [],
    )

    return (
        <div className='space-y-4'>
            <div className='grid gap-3 rounded-2xl border border-line bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4'>
                <Field label='Поиск'>
                    <Input value={filters.q} onChange={set("q")} placeholder='Название, клиент' />
                </Field>
                <Field label='Статус'>
                    <Select value={filters.status} onChange={set("status")}>
                        <option value=''>Все</option>
                        {PROJECT_STATUSES.map(s => (
                            <option key={s} value={s}>
                                {PROJECT_STATUS_LABELS[s]}
                            </option>
                        ))}
                    </Select>
                </Field>
                <Field label='Регион'>
                    <Input value={filters.region} onChange={set("region")} />
                </Field>
                <Field label='Менеджер'>
                    <SearchableSelect
                        value={filters.managerId}
                        onChange={setId("managerId")}
                        options={managerOptions}
                        placeholder='Все'
                    />
                </Field>
                <Field label='Дистрибьютор'>
                    <SearchableSelect
                        value={filters.distributorId}
                        onChange={setId("distributorId")}
                        options={distributorOptions}
                        placeholder='Все'
                    />
                </Field>
                <Field label='Конечный потребитель'>
                    <SearchableSelect
                        value={filters.customerId}
                        onChange={setId("customerId")}
                        options={customerOptions}
                        placeholder='Все'
                    />
                </Field>
            </div>

            <div className='flex justify-end'>
                <Button href='/crm/projects/new'>
                    <LuPlus className='h-4 w-4' />
                    Новый проект
                </Button>
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
                        icon={LuTarget}
                        title='Проектов не найдено'
                        hint='Попробуйте сбросить фильтры или создайте новый проект.'
                    />
                )}
                {items?.map(p => (
                    <MobileCard key={p.id} onClick={() => router.push(`/crm/projects/${p.id}`)}>
                        <div className='flex items-start justify-between gap-2'>
                            <span className='font-medium text-neutral-900'>{p.internalName}</span>
                            <Badge className={STATUS_CLASS[p.status] || ""}>
                                {PROJECT_STATUS_LABELS[p.status]}
                            </Badge>
                        </div>
                        <div className='mt-2 space-y-1'>
                            <CardRow label='Потребитель'>{p.endCustomer?.name || "—"}</CardRow>
                            <CardRow label='Дистрибьютор'>{p.distributor?.name || "—"}</CardRow>
                            <CardRow label='Регион'>
                                {p.endCustomer?.region || p.distributor?.region || "—"}
                            </CardRow>
                            <CardRow label='Менеджер'>{fullName(p.manager)}</CardRow>
                            <CardRow label='Создан'>{formatDate(p.createdAt)}</CardRow>
                            <CardRow label='Сумма сделок'>
                                <span className='font-medium text-neutral-900'>
                                    {formatMoney(p.totalAmount)}
                                </span>
                            </CardRow>
                        </div>
                    </MobileCard>
                ))}
            </div>

            <div className='hidden md:block'>
                <DataTable
                    columns={columns}
                    rows={items || []}
                    loading={items === null}
                    getRowId={p => p.id}
                    onRowClick={p => router.push(`/crm/projects/${p.id}`)}
                    initialSort={{ key: "createdAt", dir: "desc" }}
                    empty={
                        <EmptyState
                            icon={LuTarget}
                            title='Проектов не найдено'
                            hint='Попробуйте сбросить фильтры или создайте новый проект.'
                        />
                    }
                />
            </div>
        </div>
    )
}
