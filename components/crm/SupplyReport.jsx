"use client"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { LuAlertTriangle, LuBoxes, LuDownload, LuRefreshCw, LuWarehouse } from "react-icons/lu"
import { formatCrmDateTime } from "@/lib/crm/datetime"
import { DEAL_STATUS_COLORS, DEAL_STATUS_LABELS } from "@/lib/crm/deal"
import { formatMoney } from "@/lib/crm/format"
import {
    Button,
    CardListSkeleton,
    CardRow,
    DataTable,
    EmptyState,
    FilterBar,
    FilterSearch,
    FilterToggle,
    MobileCard,
    StatCard,
    useToast,
} from "@/components/crm/ui"

function qty(value) {
    const n = Number(value) || 0
    return n.toLocaleString("ru-RU", { maximumFractionDigits: 2 })
}

// Свободный остаток — главное число отчёта: минус означает, что обещали
// больше, чем лежит на складах.
function freeClass(value) {
    if (value < 0) return "text-red-600"
    if (value === 0) return "text-amber-600"
    return "text-neutral-900"
}

// В таблице то же число — плашкой: три состояния читаются с одного взгляда,
// не вчитываясь в знак минуса.
function freeBadgeClass(value) {
    if (value < 0) return "bg-red-100 text-red-700"
    if (value === 0) return "bg-amber-50 text-amber-700"
    return "bg-emerald-50 text-emerald-700"
}

function matches(haystack, q) {
    if (!q) return true
    return haystack.filter(Boolean).join(" ").toLowerCase().includes(q.toLowerCase())
}

function uniqueCounterparties(sources) {
    const seen = new Map()
    for (const s of sources || []) {
        const key = s.counterpartyId || s.counterpartyName
        if (!seen.has(key)) seen.set(key, s.counterpartyName)
    }
    return Array.from(seen.values())
}

function SectionHeading({ icon: Icon, title, hint, count }) {
    return (
        <div className='flex flex-wrap items-baseline gap-x-2 gap-y-1'>
            <h2 className='flex items-center gap-2 text-sm font-semibold text-neutral-900'>
                {Icon && <Icon className='h-4 w-4 text-brand_main' />}
                {title}
            </h2>
            {count != null && (
                <span className='text-xs tabular-nums text-neutral-400'>{count}</span>
            )}
            {hint && <span className='text-xs text-neutral-500'>· {hint}</span>}
        </div>
    )
}

// Расшифровка раскрытой строки: кто ждёт эту позицию и по какой сделке.
function SourcesTable({ sources }) {
    if (!sources?.length) {
        return <p className='text-sm text-neutral-500'>Нет позиций.</p>
    }
    return (
        <div className='overflow-x-auto'>
            {/* table-fixed + доли в процентах: иначе одна длинная сделка забирала
                всю ширину, контрагент ломался в три строки, а по центру
                оставалась пустота. */}
            <table className='w-full table-fixed text-sm'>
                <thead className='text-left text-[11px] font-medium uppercase tracking-wide text-neutral-400'>
                    <tr>
                        <th className='w-[30%] py-1.5 pr-3 font-medium'>Контрагент</th>
                        <th className='w-[34%] py-1.5 pr-3 font-medium'>Сделка</th>
                        <th className='w-[12%] whitespace-nowrap py-1.5 pr-3 text-right font-medium'>
                            Отгружено
                        </th>
                        <th className='w-[12%] whitespace-nowrap py-1.5 pr-3 text-right font-medium'>
                            К обеспечению
                        </th>
                        <th className='w-[12%] whitespace-nowrap py-1.5 text-right font-medium'>
                            На сумму
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {sources.map((s, i) => (
                        <tr
                            key={`${s.dealId}-${s.sku || s.name}-${i}`}
                            className='border-t border-line/70'
                        >
                            <td className='py-2 pr-3 align-top'>
                                {s.counterpartyId ? (
                                    <Link
                                        href={`/crm/counterparties/${s.counterpartyId}`}
                                        className='font-medium text-neutral-900 hover:text-brand_main'
                                    >
                                        {s.counterpartyName}
                                    </Link>
                                ) : (
                                    <span className='font-medium text-neutral-900'>
                                        {s.counterpartyName}
                                    </span>
                                )}
                                <span className='block text-xs tabular-nums text-neutral-500'>
                                    ИНН {s.counterpartyInn || "—"}
                                </span>
                            </td>
                            <td className='py-2 pr-3 align-top'>
                                <Link
                                    href={`/crm/deals/${s.dealId}`}
                                    title={s.dealTitle}
                                    className='block truncate text-neutral-700 hover:text-brand_main'
                                >
                                    {s.dealTitle}
                                </Link>
                                {/* Стадия важна: из «Согласовано» товар ещё может
                                    уйти, из «Договора» — уже почти наверняка нет. */}
                                <span
                                    className={`mt-0.5 inline-block rounded-full px-1.5 py-0.5 text-[11px] font-medium ${
                                        DEAL_STATUS_COLORS[s.dealStatus] ||
                                        "bg-neutral-100 text-neutral-600"
                                    }`}
                                >
                                    {DEAL_STATUS_LABELS[s.dealStatus] || s.dealStatus}
                                </span>
                            </td>
                            {/* Отгруженное по проведённым документам: в резерв
                                оно не идёт, но объясняет, почему к обеспечению
                                осталось меньше заказанного. */}
                            <td className='whitespace-nowrap py-2 pr-3 text-right align-top tabular-nums text-neutral-500'>
                                {s.shippedQty > 0 ? qty(s.shippedQty) : "—"}
                            </td>
                            <td className='whitespace-nowrap py-2 pr-3 text-right align-top font-semibold tabular-nums text-neutral-900'>
                                {qty(s.needQty)}
                            </td>
                            <td className='whitespace-nowrap py-2 text-right align-top tabular-nums text-neutral-700'>
                                {formatMoney(s.needAmount)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

export default function SupplyReport() {
    const toast = useToast()
    const [data, setData] = useState(null)
    const [error, setError] = useState("")
    const [q, setQ] = useState("")
    // Отчёт открывают ради потребности, поэтому по умолчанию показываем только
    // позиции, которые кто-то ждёт. Тумблер снимается — тогда виден весь склад.
    const [onlyNeed, setOnlyNeed] = useState(true)
    const [onlyDeficit, setOnlyDeficit] = useState(false)
    const [syncing, setSyncing] = useState(false)
    const [refreshTick, setRefreshTick] = useState(0)

    useEffect(() => {
        const controller = new AbortController()
        setError("")
        fetch("/api/crm/supply", { signal: controller.signal })
            .then(async r => {
                if (!r.ok) throw new Error((await r.json()).error || "Ошибка загрузки")
                return r.json()
            })
            .then(setData)
            .catch(err => {
                if (err.name === "AbortError") return
                setError(err.message)
                setData({ products: [], counterparties: [], unmatched: [], warehouses: [] })
            })
        return () => controller.abort()
    }, [refreshTick])

    async function syncStock() {
        setSyncing(true)
        try {
            const res = await fetch("/api/crm/stock/sync", { method: "POST" })
            const payload = await res.json().catch(() => ({}))
            if (!res.ok) {
                toast.error(payload?.error || "Не удалось обновить остатки", {
                    title: "Ошибка 1С",
                })
                return
            }
            toast.success(`Обновлено: ${payload.updated}`, { title: "Остатки обновлены" })
            setData(null)
            setRefreshTick(x => x + 1)
        } catch (err) {
            toast.error(err.message || "Сбой сети")
        } finally {
            setSyncing(false)
        }
    }

    const totals = data?.totals
    // Стабильная ссылка: колонки складов пересобираются только при новых данных.
    const warehouses = useMemo(() => data?.warehouses || [], [data])

    // Поиск сквозной: ищем и по товару, и по тем, кто его ждёт, — запрос по
    // названию клиента или ИНН оставляет в таблице его позиции.
    const productRows = useMemo(() => {
        const rows = (data?.products || []).filter(p => p.stockTotal > 0 || p.needQty > 0)
        return rows.filter(p => {
            if (onlyNeed && p.needQty <= 0) return false
            if (onlyDeficit && p.freeQty >= 0) return false
            if (!q) return true
            if (matches([p.sku, p.name, p.category], q)) return true
            return p.deals.some(d => matches([d.counterpartyName, d.counterpartyInn], q))
        })
    }, [data, q, onlyNeed, onlyDeficit])

    const unmatchedRows = useMemo(
        () =>
            (data?.unmatched || []).filter(
                u =>
                    matches([u.sku, u.name], q) ||
                    u.deals.some(d => matches([d.counterpartyName, d.counterpartyInn], q))
            ),
        [data, q]
    )

    const productColumns = useMemo(
        () => [
            {
                // Артикул и название — одна колонка: два столбца текста слева
                // растягивали таблицу и мешали числам справа выстроиться в блок.
                key: "product",
                header: "Товар",
                sortable: true,
                // Ширину ограничиваем явно — иначе длинные названия наборов
                // растягивают колонку и числа расползаются по экрану.
                cellClassName: "max-w-[24rem]",
                sortValue: p => p.sku,
                render: p => (
                    <div className='min-w-0'>
                        <Link
                            href={`/crm/products/${p.id}`}
                            onClick={e => e.stopPropagation()}
                            className='font-medium text-neutral-900 hover:text-brand_main'
                        >
                            {p.sku}
                        </Link>
                        <span className='block truncate text-xs text-neutral-500' title={p.name}>
                            {p.name}
                        </span>
                    </div>
                ),
            },
            // Склады — справочная детализация: резерв всё равно считается общим
            // по всем складам, поэтому по умолчанию колонки скрыты и включаются
            // через меню «Колонки», когда нужно понять, где товар лежит.
            ...warehouses.map(w => ({
                key: `wh:${w}`,
                header: w,
                align: "right",
                sortable: true,
                hideable: true,
                defaultHidden: true,
                headerClassName: "whitespace-nowrap font-normal text-neutral-400",
                sortValue: p => p.stockByWarehouse[w] || 0,
                render: p => (
                    <span className='text-xs tabular-nums text-neutral-500'>
                        {p.stockByWarehouse[w] ? qty(p.stockByWarehouse[w]) : "—"}
                    </span>
                ),
            })),
            {
                key: "stockTotal",
                header: "На складах",
                align: "right",
                sortable: true,
                headerClassName: "whitespace-nowrap",
                sortValue: p => p.stockTotal,
                render: p => (
                    <span className='font-medium tabular-nums text-neutral-900'>
                        {qty(p.stockTotal)}
                    </span>
                ),
            },
            {
                // Линия слева отделяет «что есть» от «что должны»: дальше идёт
                // расчётная часть таблицы.
                key: "needQty",
                header: "К обеспечению",
                align: "right",
                sortable: true,
                headerClassName: "whitespace-nowrap border-l border-line",
                cellClassName: "whitespace-nowrap border-l border-line",
                sortValue: p => p.needQty,
                render: p =>
                    p.needQty > 0 ? (
                        <div>
                            <span className='font-medium tabular-nums text-neutral-900'>
                                {qty(p.needQty)}
                            </span>
                            <span className='block text-xs text-neutral-400'>
                                {formatMoney(p.needAmount)}
                            </span>
                        </div>
                    ) : (
                        <span className='text-neutral-300'>—</span>
                    ),
            },
            {
                key: "freeQty",
                header: "Свободно",
                align: "right",
                sortable: true,
                headerClassName: "whitespace-nowrap",
                cellClassName: "whitespace-nowrap",
                sortValue: p => p.freeQty,
                render: p => (
                    <span
                        className={`inline-flex min-w-[3.5rem] justify-end rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${freeBadgeClass(p.freeQty)}`}
                    >
                        {qty(p.freeQty)}
                    </span>
                ),
            },
            {
                // Кто ждёт — прямо в строке: первый клиент виден без раскрытия,
                // остальные прячутся за «+N» и открываются шевроном.
                key: "clients",
                header: "Ждут",
                sortable: true,
                sortValue: p => uniqueCounterparties(p.deals).length,
                render: p => {
                    const names = uniqueCounterparties(p.deals)
                    if (names.length === 0) return <span className='text-neutral-300'>—</span>
                    return (
                        <span className='flex items-center gap-1'>
                            <span
                                title={names.join(", ")}
                                className='inline-block max-w-[11rem] truncate rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600'
                            >
                                {names[0]}
                            </span>
                            {names.length > 1 && (
                                <span
                                    title={names.slice(1).join(", ")}
                                    className='shrink-0 text-xs text-neutral-400'
                                >
                                    +{names.length - 1}
                                </span>
                            )}
                        </span>
                    )
                },
            },
        ],
        [warehouses]
    )

    const unmatchedColumns = useMemo(
        () => [
            {
                key: "sku",
                header: "Артикул",
                sortable: true,
                sortValue: u => u.sku || "",
                render: u => <span className='font-medium text-neutral-900'>{u.sku || "—"}</span>,
            },
            {
                key: "name",
                header: "Наименование",
                sortable: true,
                sortValue: u => u.name,
                render: u => <span className='text-neutral-700'>{u.name}</span>,
            },
            {
                key: "needQty",
                header: "К обеспечению",
                align: "right",
                sortable: true,
                headerClassName: "whitespace-nowrap",
                cellClassName: "whitespace-nowrap",
                sortValue: u => u.needQty,
                render: u => (
                    <span className='font-semibold tabular-nums text-neutral-900'>
                        {qty(u.needQty)}
                    </span>
                ),
            },
            {
                key: "needAmount",
                header: "Сумма",
                align: "right",
                sortable: true,
                sortValue: u => u.needAmount,
                render: u => formatMoney(u.needAmount),
            },
        ],
        []
    )

    // Итог по тому, что сейчас на экране: плитки сверху всегда считают по всей
    // базе, а здесь — по отфильтрованным строкам, иначе числа не сходятся с
    // таблицей и её приходится складывать глазами.
    const visibleTotals = useMemo(
        () =>
            productRows.reduce(
                (acc, p) => ({
                    stock: acc.stock + p.stockTotal,
                    need: acc.need + p.needQty,
                    amount: acc.amount + p.needAmount,
                    free: acc.free + p.freeQty,
                }),
                { stock: 0, need: 0, amount: 0, free: 0 }
            ),
        [productRows]
    )

    const loading = data === null

    // Пустая таблица чаще всего значит «потребности сейчас нет», а не «ничего не
    // нашлось» — подсказываем снять фильтр, а не менять запрос.
    const emptyState =
        onlyNeed && !q && !onlyDeficit ? (
            <EmptyState
                icon={LuBoxes}
                title='Нет товаров к обеспечению'
                hint='Ни одной сделки в статусах «Согласовано / Позиции», «Договор / Счёт» и «Выполнение / Отгрузка». Снимите фильтр «Только с потребностью», чтобы увидеть остатки по всему складу.'
            />
        ) : (
            <EmptyState
                icon={LuBoxes}
                title='Ничего не найдено'
                hint='Измените фильтры или обновите остатки из 1С.'
            />
        )

    return (
        <div className='space-y-5'>
            <div className='grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4'>
                <StatCard
                    size='sm'
                    label='На складах'
                    value={loading ? "…" : qty(totals?.stockTotal)}
                    hint={
                        totals?.syncedAt
                            ? `1С: ${formatCrmDateTime(totals.syncedAt)}`
                            : "Остатки из 1С ещё не загружались"
                    }
                    icon={LuWarehouse}
                />
                <StatCard
                    size='sm'
                    label='К обеспечению'
                    value={loading ? "…" : qty(totals?.needQty)}
                    hint={
                        loading
                            ? undefined
                            : `${totals?.counterpartiesCount || 0} клиентов · ${totals?.dealsCount || 0} сделок · ${formatMoney(totals?.needAmount)}`
                    }
                    icon={LuBoxes}
                    tone='brand'
                />
                <StatCard
                    size='sm'
                    label='Свободный остаток'
                    value={loading ? "…" : qty(totals?.freeQty)}
                    hint='Склады минус обещанное клиентам'
                    icon={LuBoxes}
                    tone={totals?.freeQty < 0 ? "danger" : "success"}
                />
                <StatCard
                    size='sm'
                    label='Позиций в дефиците'
                    value={loading ? "…" : totals?.deficitCount || 0}
                    hint='Обещано больше, чем есть на складах'
                    icon={LuAlertTriangle}
                    tone={totals?.deficitCount > 0 ? "danger" : "neutral"}
                />
            </div>

            <FilterBar
                canReset={Boolean(q || !onlyNeed || onlyDeficit)}
                onReset={() => {
                    setQ("")
                    setOnlyNeed(true)
                    setOnlyDeficit(false)
                }}
                actions={
                    <>
                        <Button
                            type='button'
                            size='sm'
                            variant='secondary'
                            onClick={syncStock}
                            loading={syncing}
                            title='Загрузить остатки из 1С'
                        >
                            <LuRefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
                            Обновить остатки
                        </Button>
                        {/* Обычная ссылка, а не Link: файл должен скачиваться,
                            а не перехватываться клиентской навигацией. */}
                        <a
                            href='/api/crm/supply/export'
                            title='Выгрузить отчёт в Excel — в файле есть и свод по контрагентам'
                            className='inline-flex h-8 items-center gap-2 rounded-xl border border-line bg-white px-3 text-sm font-medium text-neutral-800 shadow-sm transition-colors hover:bg-surface_muted'
                        >
                            <LuDownload className='h-4 w-4 text-brand_main' />
                            Excel
                        </a>
                    </>
                }
            >
                <FilterSearch
                    value={q}
                    onChange={setQ}
                    placeholder='Артикул, товар, контрагент, ИНН'
                />
                <FilterToggle
                    label='Только с потребностью'
                    active={onlyNeed}
                    onChange={setOnlyNeed}
                />
                <FilterToggle
                    label='Только дефицит'
                    active={onlyDeficit}
                    onChange={setOnlyDeficit}
                    title='Свободный остаток ушёл в минус'
                />
            </FilterBar>

            {error && (
                <p className='rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700'>
                    {error}
                </p>
            )}

            <section className='space-y-3'>
                <SectionHeading
                    icon={LuBoxes}
                    title='Баланс по товарам'
                    count={loading ? null : productRows.length}
                    hint='строка раскрывается — кто именно ждёт эту позицию'
                />

                {!loading && productRows.length > 0 && (
                    <div className='flex flex-wrap items-center gap-x-5 gap-y-1 rounded-xl border border-line bg-surface_muted/60 px-3.5 py-2 text-xs text-neutral-500'>
                        <span className='font-medium uppercase tracking-wide text-neutral-400'>
                            Итого в таблице
                        </span>
                        <span>
                            на складах{" "}
                            <b className='font-semibold tabular-nums text-neutral-900'>
                                {qty(visibleTotals.stock)}
                            </b>
                        </span>
                        <span>
                            к обеспечению{" "}
                            <b className='font-semibold tabular-nums text-neutral-900'>
                                {qty(visibleTotals.need)}
                            </b>{" "}
                            <span className='text-neutral-400'>
                                на {formatMoney(visibleTotals.amount)}
                            </span>
                        </span>
                        <span>
                            свободно{" "}
                            <b
                                className={`font-semibold tabular-nums ${freeClass(visibleTotals.free)}`}
                            >
                                {qty(visibleTotals.free)}
                            </b>
                        </span>
                    </div>
                )}

                <div className='space-y-3 md:hidden'>
                    {loading && <CardListSkeleton />}
                    {!loading && productRows.length === 0 && emptyState}
                    {productRows.map(p => (
                        <MobileCard key={p.id}>
                            <div className='flex items-start justify-between gap-2'>
                                <span className='font-medium text-neutral-900'>{p.sku}</span>
                                <span
                                    className={`shrink-0 text-sm font-semibold ${freeClass(p.freeQty)}`}
                                >
                                    {qty(p.freeQty)} свободно
                                </span>
                            </div>
                            <p className='mt-1 text-sm text-neutral-700'>{p.name}</p>
                            <div className='mt-2 space-y-1'>
                                <CardRow label='На складах'>{qty(p.stockTotal)}</CardRow>
                                <CardRow label='К обеспечению'>{qty(p.needQty)}</CardRow>
                                <CardRow label='Ждут'>
                                    {uniqueCounterparties(p.deals).join(", ") || "—"}
                                </CardRow>
                            </div>
                        </MobileCard>
                    ))}
                </div>

                <div className='hidden md:block'>
                    <DataTable
                        columns={productColumns}
                        rows={productRows}
                        loading={loading}
                        getRowId={p => p.id}
                        rowClassName={p => (p.freeQty < 0 ? "bg-red-50/40" : "")}
                        initialSort={{ key: "freeQty", dir: "asc" }}
                        pageSize={50}
                        expandable={{
                            isExpandable: p => p.deals.length > 0,
                            render: p => <SourcesTable sources={p.deals} />,
                        }}
                        empty={emptyState}
                    />
                </div>
            </section>

            {unmatchedRows.length > 0 && (
                <section className='space-y-3'>
                    <SectionHeading
                        icon={LuAlertTriangle}
                        title='Не сопоставлено со справочником'
                        count={unmatchedRows.length}
                        hint='остатка по этим позициям нет, в баланс склада они не входят'
                    />
                    <DataTable
                        columns={unmatchedColumns}
                        rows={unmatchedRows}
                        getRowId={u => u.key}
                        initialSort={{ key: "needQty", dir: "desc" }}
                        expandable={{
                            render: u => <SourcesTable sources={u.deals} />,
                        }}
                    />
                </section>
            )}
        </div>
    )
}
