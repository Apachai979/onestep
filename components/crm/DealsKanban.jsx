"use client"
import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
    DEAL_KANBAN_PER_STATUS,
    DEAL_KANBAN_STATUSES,
    DEAL_STATUS_COLORS,
    DEAL_STATUS_HINTS,
    DEAL_STATUS_LABELS,
    dealDiscountedTotal,
    dealDisplayTitle,
    isDealAbandoned,
} from "@/lib/crm/deal"

const EMPTY_COLUMN = { items: [], total: 0, sum: 0 }

// Сдержанное оформление в стиле канбана проектов: нейтральные колонки,
// тонкая приглушённая акцентная полоска сверху для быстрой ориентации.
const COLUMN_ACCENT = {
    NEGOTIATION: "bg-blue-300/70",
    CONFIRMED: "bg-indigo-300/70",
    CONTRACT: "bg-violet-300/70",
    EXECUTION: "bg-amber-300/70",
    AWAITING: "bg-teal-300/70",
    CLOSED: "bg-green-300/70",
    CANCELLED: "bg-red-300/70",
}
import { calculateDealShipmentProgress, isShipmentOverdue } from "@/lib/crm/shipment"
import { formatMoney } from "@/lib/crm/format"
import { useToast } from "@/components/crm/ui"
import { DEAL_LOCKED_STATUSES } from "@/lib/crm/access"
import { LuGavel } from "react-icons/lu"
import DealLossDialog from "./DealLossDialog"
import KanbanScroller from "./KanbanScroller"

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

function findDeal(columns, dealId) {
    for (const status of DEAL_KANBAN_STATUSES) {
        const deal = columns?.[status]?.items.find(d => d.id === dealId)
        if (deal) return deal
    }
    return null
}

// Оптимистичный перенос: карточка сразу переезжает в другую колонку, счётчик и
// сумма обеих колонок пересчитываются на месте. Точные значения (и следующая
// карточка вместо ушедшей, если колонка обрезана лимитом) придут ответом GET.
function moveCard(columns, dealId, newStatus) {
    if (!columns) return columns
    const from = DEAL_KANBAN_STATUSES.find(s =>
        (columns[s]?.items || []).some(d => d.id === dealId)
    )
    const target = columns[newStatus]
    if (!from || from === newStatus || !target) return columns

    const deal = columns[from].items.find(d => d.id === dealId)
    const amount = dealDiscountedTotal(deal)
    return {
        ...columns,
        [from]: {
            ...columns[from],
            items: columns[from].items.filter(d => d.id !== dealId),
            total: Math.max(0, columns[from].total - 1),
            sum: columns[from].sum - amount,
        },
        [newStatus]: {
            ...target,
            items: [{ ...deal, status: newStatus }, ...target.items],
            total: target.total + 1,
            sum: target.sum + amount,
        },
    }
}

// Фильтры общие для канбана и списка — они живут в DealsTabs и приходят
// сюда готовой строкой запроса (без статуса: здесь статусы — это колонки).
export default function DealsKanban({ query = "", isAdmin = false, onShowAll }) {
    const toast = useToast()
    const [columns, setColumns] = useState(null)
    const [error, setError] = useState("")
    const [draggingId, setDraggingId] = useState(null)
    const [dragOver, setDragOver] = useState(null)
    const [losingDeal, setLosingDeal] = useState(null)

    // Доска грузит по DEAL_KANBAN_PER_STATUS карточек на колонку; полное
    // количество и сумма приходят отдельными числами в каждой колонке.
    const url = useMemo(() => {
        const params = new URLSearchParams(query)
        params.set("view", "kanban")
        params.set("perStatus", String(DEAL_KANBAN_PER_STATUS))
        return `/api/crm/deals?${params}`
    }, [query])

    const fetchColumns = useCallback(
        async signal => {
            const r = await fetch(url, { signal })
            const text = await r.text()
            const data = text ? safeJson(text) : {}
            if (!r.ok) throw new Error(data?.error || `Ошибка ${r.status}`)
            return data.columns || {}
        },
        [url]
    )

    useEffect(() => {
        const controller = new AbortController()
        setError("")
        fetchColumns(controller.signal)
            .then(setColumns)
            .catch(err => {
                if (err.name === "AbortError") return
                setError(err.message)
                setColumns({})
            })
        return () => controller.abort()
    }, [fetchColumns])

    // Менеджер не вытаскивает сделку из «Закрыто»/«Не реализована»/архива.
    function isLocked(status) {
        return !isAdmin && DEAL_LOCKED_STATUSES.includes(status)
    }

    async function moveDeal(dealId, newStatus, extra = {}) {
        const prev = columns
        setColumns(curr => moveCard(curr, dealId, newStatus))
        try {
            const r = await fetch(`/api/crm/deals/${dealId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus, ...extra }),
            })
            if (!r.ok) {
                const text = await r.text()
                const d = text ? safeJson(text) : {}
                throw new Error(d?.error || "Не удалось сменить статус")
            }
            // Перечитываем: колонка могла быть обрезана лимитом, и на месте
            // ушедшей карточки должна появиться следующая.
            fetchColumns()
                .then(setColumns)
                .catch(() => {})
        } catch (err) {
            setColumns(prev)
            toast.error(err.message)
        }
    }

    function onDragStart(id) {
        return e => {
            setDraggingId(id)
            e.dataTransfer.effectAllowed = "move"
            e.dataTransfer.setData("text/plain", id)
        }
    }

    function onDragEnd() {
        setDraggingId(null)
        setDragOver(null)
    }

    function onDragOver(status) {
        return e => {
            e.preventDefault()
            e.dataTransfer.dropEffect = "move"
            if (dragOver !== status) setDragOver(status)
        }
    }

    function onDrop(status) {
        return e => {
            e.preventDefault()
            const id = e.dataTransfer.getData("text/plain") || draggingId
            setDragOver(null)
            setDraggingId(null)
            if (!id) return
            const deal = findDeal(columns, id)
            if (!deal || deal.status === status) return
            // Завершённую сделку менеджер не двигает — карточка заморожена.
            if (isLocked(deal.status)) return
            // Перенос в «Не реализована» — только с причиной.
            if (status === "CANCELLED") {
                setLosingDeal(deal)
                return
            }
            moveDeal(id, status)
        }
    }

    return (
        <div className='space-y-4'>
            {error && <p className='text-sm text-red-600'>{error}</p>}

            <KanbanScroller>
                {DEAL_KANBAN_STATUSES.map(status => {
                    const column = columns?.[status] || EMPTY_COLUMN
                    const list = column.items
                    // Колонка длиннее лимита: показываем «сколько из скольких»,
                    // чтобы счётчик не врал про объём.
                    const truncated = column.total > list.length
                    return (
                        <div
                            key={status}
                            onDragOver={onDragOver(status)}
                            onDragLeave={() => setDragOver(null)}
                            onDrop={onDrop(status)}
                            className={`flex w-[290px] shrink-0 flex-col overflow-hidden rounded-2xl border bg-surface_muted transition-shadow ${
                                dragOver === status
                                    ? "border-brand_main ring-2 ring-brand_main/25"
                                    : "border-line"
                            }`}
                        >
                            <div className={`h-0.5 w-full ${COLUMN_ACCENT[status]}`} />
                            <div className='flex flex-1 flex-col p-3'>
                                <div className='mb-1 flex items-center justify-between'>
                                    <div className='flex items-center gap-2'>
                                        <span
                                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${DEAL_STATUS_COLORS[status]}`}
                                        >
                                            {DEAL_STATUS_LABELS[status]}
                                        </span>
                                        <span
                                            className='text-xs text-neutral-400'
                                            title={
                                                truncated
                                                    ? `Показаны ${list.length} из ${column.total} — остальные в списке`
                                                    : undefined
                                            }
                                        >
                                            {truncated
                                                ? `${list.length} из ${column.total}`
                                                : column.total}
                                        </span>
                                    </div>
                                    {(status === "NEGOTIATION" || status === "CONTRACT") && (
                                        <Link
                                            href={`/crm/deals/new?status=${status}`}
                                            className='inline-flex h-6 w-6 items-center justify-center rounded-lg border border-line bg-white text-neutral-500 transition-colors hover:border-brand_main/40 hover:text-brand_main'
                                            title='Добавить сделку с этим статусом'
                                        >
                                            +
                                        </Link>
                                    )}
                                </div>
                                {DEAL_STATUS_HINTS[status] && (
                                    <p className='mb-1 text-[10px] leading-tight text-neutral-400'>
                                        {DEAL_STATUS_HINTS[status]}
                                    </p>
                                )}
                                {/* Итог считается по всей колонке, а не по загруженным карточкам. */}
                                <p className='mb-3 text-xs text-neutral-500'>
                                    Итого: {formatMoney(column.sum)}
                                </p>
                                <div className='flex flex-col gap-2'>
                                    {columns === null && (
                                        <p className='text-xs text-neutral-400'>Загрузка...</p>
                                    )}
                                    {list.map(d => (
                                        <DealCard
                                            key={d.id}
                                            deal={d}
                                            locked={isLocked(d.status)}
                                            dragging={draggingId === d.id}
                                            onDragStart={onDragStart(d.id)}
                                            onDragEnd={onDragEnd}
                                        />
                                    ))}
                                    {columns !== null && list.length === 0 && (
                                        <p className='text-xs italic text-neutral-400'>Пусто</p>
                                    )}
                                    {truncated && (
                                        <button
                                            type='button'
                                            onClick={() => onShowAll?.(status)}
                                            className='rounded-xl border border-dashed border-line py-2 text-xs font-medium text-neutral-500 transition-colors hover:border-brand_main/40 hover:text-brand_main'
                                        >
                                            Показать все ({column.total}) →
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                })}
            </KanbanScroller>

            {losingDeal && (
                <DealLossDialog
                    dealTitle={dealDisplayTitle(losingDeal, losingDeal.counterparty?.name)}
                    onCancel={() => setLosingDeal(null)}
                    onConfirm={({ lossReason, lossComment }) => {
                        moveDeal(losingDeal.id, "CANCELLED", { lossReason, lossComment })
                        setLosingDeal(null)
                    }}
                />
            )}
        </div>
    )
}

function DealCard({ deal, locked, dragging, onDragStart, onDragEnd }) {
    const title = dealDisplayTitle(deal, deal.counterparty?.name)
    const hasItems = Array.isArray(deal.items) && deal.items.length > 0
    const progress = hasItems ? calculateDealShipmentProgress(deal) : null
    const hasOverdue = Array.isArray(deal.shipments) && deal.shipments.some(isShipmentOverdue)
    // На карточке показываем сумму со скидкой — это то, что реально получим.
    const discountPct = deal.discount != null ? Number(deal.discount) : 0
    const amount = dealDiscountedTotal(deal)
    const abandoned = isDealAbandoned(deal)

    return (
        <Link
            href={`/crm/deals/${deal.id}`}
            draggable={!locked}
            onDragStart={locked ? undefined : onDragStart}
            onDragEnd={locked ? undefined : onDragEnd}
            className={`block cursor-pointer rounded-xl border bg-white p-3 text-sm shadow-sm transition-all duration-200 hover:border-line_strong hover:shadow-md ${
                dragging ? "opacity-50" : "border-line"
            }`}
        >
            {/* У аукциона верхней строкой — иконка и номер закупки: по нему
                сделку и ищут глазами, а в отдельной строке он не отжимает
                название в узкую колонку. Номер необязателен, поэтому без него
                аукцион помечаем прежней иконкой прямо в строке названия —
                иначе пометка исчезла бы совсем. */}
            {deal.isAuction && deal.purchaseNumber && (
                <p
                    className='mb-1 flex items-center gap-1 text-amber-700'
                    title={`Закупка № ${deal.purchaseNumber}`}
                >
                    <LuGavel size={12} className='shrink-0' />
                    <span className='truncate text-[11px] font-semibold'>
                        <span className='text-[10px] font-normal'>№</span> {deal.purchaseNumber}
                    </span>
                </p>
            )}
            <p className='font-medium leading-snug text-neutral-900'>
                {deal.isAuction && !deal.purchaseNumber && (
                    <LuGavel
                        size={13}
                        title='Аукцион'
                        className='mr-1 inline align-[-0.15em] text-amber-600'
                    />
                )}
                {title}
            </p>
            <div className='mt-1 flex items-center justify-between gap-2'>
                <p className='min-w-0 truncate text-xs text-neutral-500'>
                    {deal.counterparty?.name || "Без клиента"}
                </p>
                {abandoned && (
                    <span
                        className='shrink-0 rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700'
                        title='По сделке нет ни одной открытой задачи — следующий шаг не запланирован'
                    >
                        Без задач
                    </span>
                )}
            </div>
            <div className='mt-2 flex items-center justify-between gap-2 text-xs'>
                <span className='truncate text-neutral-500'>{managerName(deal.manager)}</span>
                <span
                    className='shrink-0 font-semibold text-neutral-700'
                    title={
                        discountPct > 0
                            ? `Сумма со скидкой ${discountPct}% (без скидки ${formatMoney(deal.totalAmount)})`
                            : undefined
                    }
                >
                    {formatMoney(amount)}
                </span>
            </div>
            {progress && progress.totalOrdered > 0 && (
                <div className='mt-2'>
                    <div className='flex items-center justify-between text-[10px] text-neutral-500'>
                        <span>
                            Отгружено {progress.percent}%
                            {progress.isFullyShipped && (
                                <span className='ml-1 text-emerald-600'>· готово</span>
                            )}
                        </span>
                        {hasOverdue && (
                            <span className='rounded-full bg-red-50 px-1.5 py-0.5 text-[9px] font-semibold text-red-700'>
                                Просрочка
                            </span>
                        )}
                    </div>
                    <div className='mt-1 h-1.5 w-full overflow-hidden rounded-full bg-neutral-200'>
                        <div
                            className={`h-full transition-all ${
                                progress.isFullyShipped ? "bg-emerald-500" : "bg-brand_main"
                            }`}
                            style={{ width: `${progress.percent}%` }}
                        />
                    </div>
                </div>
            )}
        </Link>
    )
}
