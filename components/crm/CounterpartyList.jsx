"use client"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { LuPlus, LuSearch, LuUsers } from "react-icons/lu"
import { formatMoney, formatPercent } from "@/lib/crm/format"
import {
    Button,
    CardListSkeleton,
    CardRow,
    DataTable,
    EmptyState,
    Field,
    Input,
    MobileCard,
} from "@/components/crm/ui"
import PhoneLink from "./PhoneLink"

function counterpartyPhone(item) {
    return item.phone || item.contacts?.[0]?.phone || null
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
                key: "discount",
                header: "Скидка",
                align: "right",
                render: item => formatPercent(item.discount),
            },
        ],
        [],
    )

    return (
        <div className='space-y-4'>
            <div className='flex flex-wrap items-end gap-3 rounded-2xl border border-line bg-white p-4 shadow-sm'>
                <Field label='Поиск' className='flex-1 min-w-[220px]'>
                    <Input
                        icon={LuSearch}
                        value={q}
                        onChange={e => setQ(e.target.value)}
                        placeholder='Название, ИНН, контактное лицо'
                    />
                </Field>
                <Field label='Регион' className='min-w-[200px]'>
                    <Input value={region} onChange={e => setRegion(e.target.value)} />
                </Field>
                <Button href={newHref}>
                    <LuPlus className='h-4 w-4' />
                    Добавить
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
                            <CardRow label='ИНН'>{item.inn || "—"}</CardRow>
                            <CardRow label='Контакт'>{primaryContactName(item)}</CardRow>
                            <CardRow label='Телефон'>
                                {counterpartyPhone(item) ? (
                                    <PhoneLink phone={counterpartyPhone(item)} />
                                ) : (
                                    "—"
                                )}
                            </CardRow>
                            <CardRow label='Бюджет'>{formatMoney(item.totalRevenue)}</CardRow>
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
