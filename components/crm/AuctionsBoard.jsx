"use client"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { LuCalendarClock, LuExternalLink, LuGavel } from "react-icons/lu"
import {
    AUCTION_BOARD_PER_COLUMN,
    AUCTION_COLUMNS,
    auctionBoardDate,
    auctionBoardOutcome,
    auctionDaysLeft,
    auctionDueLabel,
    auctionResultOverdue,
    auctionResultPending,
} from "@/lib/crm/auction-board"
import { DEAL_STATUS_COLORS, DEAL_STATUS_LABELS, dealDisplayTitle } from "@/lib/crm/deal"
import { crmHm, formatCrmDate, formatCrmTime } from "@/lib/crm/datetime"
import { formatMoney } from "@/lib/crm/format"
import KanbanScroller from "./KanbanScroller"

const EMPTY_COLUMN = { items: [], total: 0, sum: 0 }

// Итог прошедших торгов — лёгкой заливкой карточки и плашкой. Цвет намеренно
// бледный: колонка «Прошли» должна читаться как сводка, а не светофор.
const OUTCOME_STYLE = {
    WON: {
        card: "border-emerald-200 bg-emerald-50/40 hover:border-emerald-300",
        badge: "bg-emerald-100 text-emerald-700",
        label: "Выиграли",
    },
    LOST: {
        card: "border-red-200 bg-red-50/40 hover:border-red-300",
        badge: "bg-red-100 text-red-700",
        label: "Проиграли",
    },
    VOID: {
        card: "border-neutral-200 bg-neutral-50 hover:border-neutral-300",
        badge: "bg-neutral-200 text-neutral-600",
        label: "Закупка отменена",
    },
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

// Время показываем только если оно проставлено: полночь — это «дату знаем,
// час нет», и «в 00:00» на карточке читалось бы как настоящее время торгов.
function auctionDateLabel(value) {
    if (!value) return "Срок не указан"
    const date = formatCrmDate(value)
    return crmHm(value) === "00:00" ? date : `${date} в ${formatCrmTime(value)}`
}

// Колонки доски вычисляются из срока закупки, поэтому перетаскивания здесь нет:
// «перенести» карточку значило бы сдвинуть дату торгов. Фильтры общие со
// сделками — приходят готовой строкой запроса из DealsTabs.
export default function AuctionsBoard({ query = "" }) {
    const [columns, setColumns] = useState(null)
    const [today, setToday] = useState(null)
    const [error, setError] = useState("")

    const url = useMemo(() => {
        const params = new URLSearchParams(query)
        params.set("view", "auctions")
        params.set("perColumn", String(AUCTION_BOARD_PER_COLUMN))
        return `/api/crm/deals?${params}`
    }, [query])

    useEffect(() => {
        const controller = new AbortController()
        setError("")
        fetch(url, { signal: controller.signal })
            .then(async r => {
                const text = await r.text()
                const data = text ? safeJson(text) : {}
                if (!r.ok) throw new Error(data?.error || `Ошибка ${r.status}`)
                setColumns(data.columns || {})
                // «Сегодня» берём с сервера: доска живёт в московском времени,
                // а браузер менеджера может стоять в другой зоне.
                setToday(data.today || null)
            })
            .catch(err => {
                if (err.name === "AbortError") return
                setError(err.message)
                setColumns({})
            })
        return () => controller.abort()
    }, [url])

    return (
        <div className='space-y-4'>
            {error && <p className='text-sm text-red-600'>{error}</p>}

            <KanbanScroller>
                {AUCTION_COLUMNS.map(column => {
                    const data = columns?.[column.key] || EMPTY_COLUMN
                    const list = data.items
                    const truncated = data.total > list.length
                    return (
                        <div
                            key={column.key}
                            className='flex w-[290px] shrink-0 flex-col overflow-hidden rounded-2xl border border-line bg-surface_muted'
                        >
                            <div className={`h-0.5 w-full ${column.accent}`} />
                            <div className='flex flex-1 flex-col p-3'>
                                <div className='mb-1 flex items-center gap-2'>
                                    <span
                                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${column.badge}`}
                                    >
                                        {column.label}
                                    </span>
                                    <span
                                        className='text-xs text-neutral-400'
                                        title={
                                            truncated
                                                ? `Показаны ${list.length} из ${data.total}`
                                                : undefined
                                        }
                                    >
                                        {truncated ? `${list.length} из ${data.total}` : data.total}
                                    </span>
                                </div>
                                <p className='mb-1 text-[10px] leading-tight text-neutral-400'>
                                    {column.hint}
                                </p>
                                {/* Итог по НМЦК: сумму собственной заявки до торгов
                                    часто ещё не проставили, а начальная цена есть всегда. */}
                                <p className='mb-3 text-xs text-neutral-500'>
                                    НМЦК: {formatMoney(data.sum)}
                                </p>
                                <div className='flex flex-col gap-2'>
                                    {columns === null && (
                                        <p className='text-xs text-neutral-400'>Загрузка...</p>
                                    )}
                                    {list.map(deal => (
                                        <AuctionCard key={deal.id} deal={deal} today={today} />
                                    ))}
                                    {columns !== null && list.length === 0 && (
                                        <p className='text-xs italic text-neutral-400'>Пусто</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                })}
            </KanbanScroller>
        </div>
    )
}

function AuctionCard({ deal, today }) {
    const date = auctionBoardDate(deal)
    const due = today ? auctionDueLabel(deal, today) : null
    const days = today ? auctionDaysLeft(deal, today) : null
    // Итог ждём только у прошедших торгов: у будущих сделка и должна стоять
    // в «Переговорах».
    const awaitingResult = days !== null && days < 0 && auctionResultPending(deal)
    const overdue = today ? auctionResultOverdue(deal, today) : false
    const outcome = today ? auctionBoardOutcome(deal, today) : null
    const outcomeStyle = outcome ? OUTCOME_STYLE[outcome] : null
    // Заказчик — то, по чему аукцион узнают: клиент (дистрибьютор) у серии
    // закупок часто один и тот же. Без заказчика показываем название сделки.
    const heading = deal.auctionCustomer?.name || dealDisplayTitle(deal, deal.counterparty?.name)

    return (
        <Link
            href={`/crm/deals/${deal.id}`}
            className={`block rounded-xl border p-3 text-sm shadow-sm transition-all duration-200 hover:shadow-md ${
                outcomeStyle?.card || "border-line bg-white hover:border-line_strong"
            }`}
        >
            <div className='mb-1 flex items-center gap-1 text-amber-700'>
                <LuGavel size={12} className='shrink-0' />
                <span className='truncate text-[11px] font-semibold'>
                    {deal.purchaseNumber ? (
                        <>
                            <span className='text-[10px] font-normal'>№</span>{" "}
                            {deal.purchaseNumber}
                        </>
                    ) : (
                        <span className='font-normal text-neutral-400'>без номера закупки</span>
                    )}
                </span>
                {deal.auctionUrl && (
                    // Карточка целиком — ссылка на сделку, поэтому вложенного
                    // <a> здесь быть не может: открываем площадку вручную.
                    <span
                        role='link'
                        tabIndex={0}
                        title='Открыть закупку на площадке'
                        onClick={e => {
                            e.preventDefault()
                            e.stopPropagation()
                            window.open(deal.auctionUrl, "_blank", "noopener,noreferrer")
                        }}
                        onKeyDown={e => {
                            if (e.key !== "Enter" && e.key !== " ") return
                            e.preventDefault()
                            e.stopPropagation()
                            window.open(deal.auctionUrl, "_blank", "noopener,noreferrer")
                        }}
                        className='ml-auto shrink-0 text-neutral-400 transition-colors hover:text-brand_main'
                    >
                        <LuExternalLink size={12} />
                    </span>
                )}
            </div>

            <p className='font-medium leading-snug text-neutral-900'>{heading}</p>
            <p className='mt-0.5 truncate text-xs text-neutral-500'>
                {deal.counterparty?.name || "Без клиента"}
            </p>

            <p
                className='mt-2 flex items-center gap-1 text-xs text-neutral-600'
                title='Окончание приёма заявок'
            >
                <LuCalendarClock size={12} className='shrink-0 text-neutral-400' />
                <span className='truncate'>
                    {auctionDateLabel(date)}
                    {due && date && <span className='text-neutral-400'> · {due}</span>}
                </span>
            </p>

            {/* Кто забрал закупку — только у проигранных: при выигрыше
                победитель это мы, и поле там обычно пустое. */}
            {outcome === "LOST" && deal.winner && (
                <p className='mt-1 truncate text-[11px] text-neutral-500' title={deal.winner}>
                    Победитель: {deal.winner}
                </p>
            )}

            <div className='mt-2 flex items-center justify-between gap-2 text-xs'>
                <span
                    className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                        DEAL_STATUS_COLORS[deal.status]
                    }`}
                >
                    {DEAL_STATUS_LABELS[deal.status] || deal.status}
                </span>
                <span className='shrink-0 font-semibold text-neutral-700' title='НМЦК'>
                    {formatMoney(deal.nmck)}
                </span>
            </div>

            <div className='mt-2 flex items-center justify-between gap-2'>
                <span className='min-w-0 truncate text-xs text-neutral-500'>
                    {managerName(deal.manager)}
                </span>
                {/* Торги прошли, а сделка всё ещё на дотроговой стадии — итог
                    не зафиксирован. Такая карточка с доски не уходит. */}
                {awaitingResult && (
                    <span
                        className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${
                            overdue ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"
                        }`}
                        title='Двиньте сделку по воронке (выиграли) или в «Не реализована» (проиграли)'
                    >
                        Нет результата
                    </span>
                )}
                {outcomeStyle && (
                    <span
                        className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${outcomeStyle.badge}`}
                    >
                        {outcomeStyle.label}
                    </span>
                )}
            </div>
        </Link>
    )
}
