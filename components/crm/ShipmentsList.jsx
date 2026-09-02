"use client"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { LuTruck } from "react-icons/lu"
import { dealDisplayTitle } from "@/lib/crm/deal"
import {
    SHIPMENT_STATUSES,
    SHIPMENT_STATUS_COLORS,
    SHIPMENT_STATUS_LABELS,
    calculateShipmentWeightVolume,
    formatVolumeM3,
    formatWeightKg,
    isShipmentOverdue,
} from "@/lib/crm/shipment"
import {
    Badge,
    CardListSkeleton,
    CardRow,
    DataTable,
    EmptyState,
    FilterBar,
    FilterSearch,
    FilterSelect,
    FilterToggle,
    MobileCard,
} from "@/components/crm/ui"

function safeJson(text) {
    try {
        return JSON.parse(text)
    } catch {
        return null
    }
}

function fmtDate(d) {
    if (!d) return "—"
    return new Date(d).toLocaleDateString("ru-RU")
}

function num(v) {
    if (v === null || v === undefined || v === "") return 0
    const s = typeof v === "object" && v.toString ? v.toString() : String(v)
    const n = Number(s.replace(",", "."))
    return Number.isFinite(n) ? n : 0
}

function fmtQty(v) {
    const n = num(v)
    return (Math.round(n * 1000) / 1000).toString().replace(".", ",")
}

function managerName(u) {
    if (!u) return "—"
    return `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email
}

export default function ShipmentsList() {
    const router = useRouter()
    const [items, setItems] = useState(null)
    const [error, setError] = useState("")
    const [q, setQ] = useState("")
    const [status, setStatus] = useState("")
    const [onlyWithRemaining, setOnlyWithRemaining] = useState(false)
    const [onlyOverdue, setOnlyOverdue] = useState(false)

    async function load() {
        setError("")
        try {
            const params = new URLSearchParams()
            if (status) params.set("status", status)
            if (q.trim()) params.set("q", q.trim())
            const r = await fetch(`/api/crm/shipments?${params}`)
            const text = await r.text()
            const data = text ? safeJson(text) : {}
            if (!r.ok) throw new Error(data?.error || `Ошибка ${r.status}`)
            setItems(data.items || [])
        } catch (err) {
            setError(err.message)
            setItems([])
        }
    }

    // Поиск отправляем на сервер после паузы в наборе, а не на каждый символ.
    const [qDebounced, setQDebounced] = useState("")
    useEffect(() => {
        const t = setTimeout(() => setQDebounced(q.trim()), 350)
        return () => clearTimeout(t)
    }, [q])

    useEffect(() => {
        load()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status, qDebounced])

    const filtered = useMemo(() => {
        if (!items) return null
        return items.filter(sh => {
            if (onlyOverdue && !isShipmentOverdue(sh)) return false
            return true
        })
    }, [items, onlyOverdue])

    const columns = useMemo(
        () => [
            {
                key: "number",
                header: "№",
                sortable: true,
                sortValue: sh => sh.number,
                render: sh => (
                    <span className='inline-flex items-center gap-1.5'>
                        <Link
                            href={`/crm/shipments/${sh.id}`}
                            onClick={e => e.stopPropagation()}
                            className='font-mono font-medium text-neutral-900 hover:text-brand_main'
                        >
                            {sh.number}
                        </Link>
                    </span>
                ),
            },
            {
                key: "status",
                header: "Статус",
                sortable: true,
                sortValue: sh => SHIPMENT_STATUS_LABELS[sh.status] || sh.status,
                render: sh => (
                    <span className='inline-flex flex-wrap items-center gap-1.5'>
                        <Badge className={SHIPMENT_STATUS_COLORS[sh.status]}>
                            {SHIPMENT_STATUS_LABELS[sh.status]}
                        </Badge>
                        {isShipmentOverdue(sh) && (
                            <Badge tone='danger'>Просрочена</Badge>
                        )}
                    </span>
                ),
            },
            {
                key: "deal",
                header: "Сделка",
                render: sh => (
                    <Link
                        href={`/crm/deals/${sh.deal.id}`}
                        onClick={e => e.stopPropagation()}
                        className='text-neutral-900 hover:text-brand_main'
                    >
                        {dealDisplayTitle(sh.deal, sh.deal.counterparty?.name)}
                    </Link>
                ),
            },
            {
                key: "customer",
                header: "Клиент",
                sortValue: sh => sh.deal.counterparty?.name || "",
                render: sh => sh.deal.counterparty?.name || "—",
                hideable: true,
            },
            {
                key: "manager",
                header: "Менеджер",
                render: sh => managerName(sh.deal.manager),
                hideable: true,
            },
            {
                key: "plannedDate",
                header: "Плановая",
                sortable: true,
                sortValue: sh => (sh.plannedDate ? new Date(sh.plannedDate).getTime() : 0),
                render: sh => fmtDate(sh.plannedDate),
            },
            {
                key: "shippedAt",
                header: "Отгружена",
                sortable: true,
                sortValue: sh => (sh.shippedAt ? new Date(sh.shippedAt).getTime() : 0),
                render: sh => fmtDate(sh.shippedAt),
                hideable: true,
            },
            {
                key: "qty",
                header: "Позиций / шт.",
                align: "right",
                render: sh => {
                    const totalQty = (sh.items || []).reduce((s, it) => s + num(it.quantity), 0)
                    return `${sh.items?.length || 0} (${fmtQty(totalQty)})`
                },
            },
            {
                key: "weightVolume",
                header: "Вес / Объём",
                align: "right",
                render: sh => {
                    const wv = calculateShipmentWeightVolume(sh)
                    return `${formatWeightKg(wv.weight)} / ${formatVolumeM3(wv.volume)}${
                        wv.incomplete ? " *" : ""
                    }`
                },
                hideable: true,
            },
        ],
        [],
    )

    return (
        <div className='space-y-4'>
            <FilterBar
                canReset={Boolean(status || onlyOverdue)}
                onReset={() => {
                    setQ("")
                    setStatus("")
                    setOnlyOverdue(false)
                }}
            >
                <FilterSearch
                    value={q}
                    onChange={setQ}
                    onEnter={load}
                    placeholder='Номер, сделка, клиент, трек'
                />
                <FilterSelect
                    label='Статус'
                    value={status}
                    onChange={setStatus}
                    options={SHIPMENT_STATUSES.map(s => ({
                        value: s,
                        label: SHIPMENT_STATUS_LABELS[s],
                    }))}
                />
                <FilterToggle
                    label='Только просроченные'
                    active={onlyOverdue}
                    onChange={setOnlyOverdue}
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
                {filtered && filtered.length === 0 && (
                    <EmptyState
                        icon={LuTruck}
                        title='Отгрузок не найдено'
                        hint='Попробуйте изменить фильтры — или зайдите в нужную сделку и добавьте отгрузку.'
                    />
                )}
                {filtered?.map(sh => {
                    const totalQty = (sh.items || []).reduce((s, it) => s + num(it.quantity), 0)
                    const wv = calculateShipmentWeightVolume(sh)
                    const overdue = isShipmentOverdue(sh)
                    return (
                        <MobileCard
                            key={sh.id}
                            onClick={() => router.push(`/crm/shipments/${sh.id}`)}
                            className={overdue ? "bg-red-50/40" : ""}
                        >
                            <div className='flex items-start justify-between gap-2'>
                                <span className='font-mono font-medium text-neutral-900'>
                                    {sh.number}
                                </span>
                                <span className='flex shrink-0 flex-wrap justify-end gap-1'>
                                    <Badge className={SHIPMENT_STATUS_COLORS[sh.status]}>
                                        {SHIPMENT_STATUS_LABELS[sh.status]}
                                    </Badge>
                                    {overdue && <Badge tone='danger'>Просрочена</Badge>}
                                </span>
                            </div>
                            <div className='mt-2 space-y-1'>
                                <CardRow label='Сделка'>
                                    <Link
                                        href={`/crm/deals/${sh.deal.id}`}
                                        onClick={e => e.stopPropagation()}
                                        className='text-neutral-900 underline hover:text-brand_main'
                                    >
                                        {dealDisplayTitle(sh.deal, sh.deal.counterparty?.name)}
                                    </Link>
                                </CardRow>
                                <CardRow label='Клиент'>{sh.deal.counterparty?.name || "—"}</CardRow>
                                <CardRow label='Менеджер'>{managerName(sh.deal.manager)}</CardRow>
                                <CardRow label='Плановая'>{fmtDate(sh.plannedDate)}</CardRow>
                                <CardRow label='Отгружена'>{fmtDate(sh.shippedAt)}</CardRow>
                                <CardRow label='Позиций / шт.'>
                                    {sh.items?.length || 0} ({fmtQty(totalQty)})
                                </CardRow>
                                <CardRow label='Вес / Объём'>
                                    {formatWeightKg(wv.weight)} / {formatVolumeM3(wv.volume)}
                                    {wv.incomplete ? " *" : ""}
                                </CardRow>
                            </div>
                        </MobileCard>
                    )
                })}
            </div>

            <div className='hidden md:block'>
                <DataTable
                    columns={columns}
                    rows={filtered || []}
                    loading={items === null}
                    getRowId={sh => sh.id}
                    rowHref={sh => `/crm/shipments/${sh.id}`}
                    rowClassName={sh => (isShipmentOverdue(sh) ? "bg-red-50/40" : "")}
                    initialSort={{ key: "plannedDate", dir: "asc" }}
                    empty={
                        <EmptyState
                            icon={LuTruck}
                            title='Отгрузок не найдено'
                            hint='Попробуйте изменить фильтры — или зайдите в нужную сделку и добавьте отгрузку.'
                        />
                    }
                />
            </div>
        </div>
    )
}
