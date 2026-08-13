"use client"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
    LuAlertTriangle,
    LuBarChart3,
    LuBoxes,
    LuDownload,
    LuPackage,
    LuTrendingDown,
    LuTrendingUp,
    LuTruck,
    LuUsers,
    LuWallet,
} from "react-icons/lu"
import PeriodFilter from "@/components/crm/PeriodFilter"
import { crmToday, formatCrmDate } from "@/lib/crm/datetime"
import { DEAL_STATUS_COLORS, DEAL_STATUS_LABELS } from "@/lib/crm/deal"
import { formatMoney } from "@/lib/crm/format"
import {
    DEFAULT_PERIOD_PRESET,
    formatMonthKey,
    formatPeriodLabel,
    periodPreset,
} from "@/lib/crm/period"
import {
    CardListSkeleton,
    CardRow,
    DataTable,
    EmptyState,
    FilterBar,
    MobileCard,
    StatCard,
} from "@/components/crm/ui"

function qty(value) {
    const n = Number(value) || 0
    return n.toLocaleString("ru-RU", { maximumFractionDigits: 2 })
}

// Крупные суммы в плитках сокращаем: «12,4 млн» читается с одного взгляда, а
// 12 437 210,50 ₽ — нет. В таблицах и расшифровках рубли остаются полными.
function shortMoney(value) {
    const n = Number(value) || 0
    const abs = Math.abs(n)
    if (abs >= 1_000_000) return `${(n / 1_000_000).toLocaleString("ru-RU", { maximumFractionDigits: 1 })} млн ₽`
    if (abs >= 100_000) return `${(n / 1000).toLocaleString("ru-RU", { maximumFractionDigits: 0 })} тыс ₽`
    return formatMoney(n)
}

function SectionHeading({ icon: Icon, title, hint, count }) {
    return (
        <div className='flex flex-wrap items-center gap-x-2 gap-y-1'>
            <h2 className='flex items-center gap-2 text-sm font-semibold leading-5 text-neutral-900'>
                {Icon && <Icon className='h-4 w-4 text-brand_main' />}
                {title}
            </h2>
            {count != null && (
                <span className='text-xs leading-5 tabular-nums text-neutral-400'>{count}</span>
            )}
            {hint && <span className='text-xs leading-5 text-neutral-500'>· {hint}</span>}
        </div>
    )
}

// Полоска доли — вместо графика: библиотеку ради одной диаграммы не тянем, а
// ширина в процентах от максимума читается не хуже столбчатой.
function Bar({ value, max, tone = "brand" }) {
    const pct = max > 0 ? Math.max(value > 0 ? 2 : 0, (value / max) * 100) : 0
    const color = tone === "muted" ? "bg-neutral-300" : "bg-brand_main/70"
    return (
        <span className='block h-1.5 w-full overflow-hidden rounded-full bg-neutral-100'>
            <span className={`block h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
        </span>
    )
}

// Динамика по месяцам: месяц без отгрузок остаётся в списке нулём — провал
// должен быть виден, а не пропущен.
function MonthlyChart({ months }) {
    const max = Math.max(...months.map(m => m.amount), 0)
    if (!months.length) return null
    return (
        <div className='rounded-2xl border border-line bg-white p-3.5 shadow-sm'>
            <div className='space-y-2'>
                {months.map(m => (
                    <div key={m.key} className='flex items-center gap-3'>
                        <span className='w-20 shrink-0 text-xs text-neutral-500'>
                            {formatMonthKey(m.key)}
                        </span>
                        <span className='min-w-0 flex-1'>
                            <Bar value={m.amount} max={max} tone={m.amount ? "brand" : "muted"} />
                        </span>
                        <span className='w-32 shrink-0 text-right text-sm font-medium tabular-nums text-neutral-900'>
                            {m.amount ? formatMoney(m.amount) : "—"}
                        </span>
                        <span
                            className='hidden w-24 shrink-0 text-right text-xs tabular-nums text-neutral-400 sm:block'
                            title='Отгрузок за месяц'
                        >
                            {m.shipmentsCount ? `${m.shipmentsCount} отгр.` : ""}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    )
}

const DETAILS = [
    { key: "counterparties", label: "Клиенты" },
    { key: "products", label: "Товары" },
    { key: "shipments", label: "Отгрузки" },
]

// Расшифровка строки менеджера. Три разреза одной цифры, поэтому вкладки, а не
// три таблицы подряд: иначе раскрытая строка занимает несколько экранов.
function ManagerDetails({ manager }) {
    const [tab, setTab] = useState("counterparties")

    return (
        <div className='space-y-3'>
            <div className='flex flex-wrap items-center gap-1'>
                {DETAILS.map(d => (
                    <button
                        key={d.key}
                        type='button'
                        onClick={() => setTab(d.key)}
                        className={`h-7 rounded-lg px-2.5 text-xs transition-colors ${
                            tab === d.key
                                ? "bg-brand_main/10 font-medium text-neutral-900"
                                : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
                        }`}
                    >
                        {d.label}
                        <span className='ml-1 tabular-nums text-neutral-400'>
                            {d.key === "counterparties"
                                ? manager.counterparties.length
                                : d.key === "products"
                                  ? manager.products.length
                                  : manager.shipments.length}
                        </span>
                    </button>
                ))}
            </div>

            {tab === "counterparties" && (
                <DetailTable
                    head={["Контрагент", "Отгрузок", "Штук", "Продано"]}
                    rows={manager.counterparties.map(c => ({
                        key: c.id || c.name,
                        cells: [
                            c.id ? (
                                <Link
                                    href={`/crm/counterparties/${c.id}`}
                                    className='font-medium text-neutral-900 hover:text-brand_main'
                                >
                                    {c.name}
                                </Link>
                            ) : (
                                <span className='font-medium text-neutral-900'>{c.name}</span>
                            ),
                            c.shipmentsCount,
                            qty(c.qty),
                            formatMoney(c.amount),
                        ],
                    }))}
                />
            )}

            {tab === "products" && (
                <DetailTable
                    head={["Артикул", "Наименование", "Штук", "Продано"]}
                    rows={manager.products.map(p => ({
                        key: p.key,
                        cells: [
                            p.productId ? (
                                <Link
                                    href={`/crm/products/${p.productId}`}
                                    className='font-medium text-neutral-900 hover:text-brand_main'
                                >
                                    {p.sku || "—"}
                                </Link>
                            ) : (
                                <span
                                    className='text-neutral-500'
                                    title='Позиция вписана вручную, в справочнике её нет'
                                >
                                    {p.sku || "—"}
                                </span>
                            ),
                            <span key='name' className='text-neutral-700'>
                                {p.name}
                            </span>,
                            qty(p.qty),
                            formatMoney(p.amount),
                        ],
                    }))}
                />
            )}

            {tab === "shipments" && (
                <DetailTable
                    head={["Дата", "Отгрузка", "Клиент / сделка", "Штук", "Сумма"]}
                    rows={manager.shipments.map(s => ({
                        key: s.id,
                        cells: [
                            <span key='date' className='whitespace-nowrap text-neutral-500'>
                                {formatCrmDate(s.shippedAt)}
                            </span>,
                            <span key='number'>
                                <Link
                                    href={`/crm/shipments/${s.id}`}
                                    className='font-medium text-neutral-900 hover:text-brand_main'
                                >
                                    {s.number}
                                </Link>
                                {/* Документ мог завести не владелец сделки —
                                    без этой подписи чужая фамилия в истории
                                    выглядит ошибкой. */}
                                {s.createdByOther && (
                                    <span
                                        className='block text-[11px] text-neutral-400'
                                        title='Отгрузку оформил другой сотрудник'
                                    >
                                        оформил {s.createdByName}
                                    </span>
                                )}
                            </span>,
                            <span key='cp' className='min-w-0'>
                                <span className='block truncate text-neutral-700'>
                                    {s.counterpartyName}
                                </span>
                                {s.dealId && (
                                    <Link
                                        href={`/crm/deals/${s.dealId}`}
                                        title={s.dealTitle}
                                        className='block truncate text-xs text-neutral-400 hover:text-brand_main'
                                    >
                                        {s.dealTitle}
                                    </Link>
                                )}
                            </span>,
                            qty(s.qty),
                            formatMoney(s.amount),
                        ],
                    }))}
                />
            )}
        </div>
    )
}

// Таблица расшифровки: первые колонки текстовые, последние две — числовые.
function DetailTable({ head, rows }) {
    if (!rows.length) return <p className='text-sm text-neutral-500'>Нет данных.</p>
    return (
        <div className='overflow-x-auto'>
            <table className='w-full table-fixed text-sm'>
                <thead className='text-left text-[11px] font-medium uppercase tracking-wide text-neutral-400'>
                    <tr>
                        {head.map((h, i) => (
                            <th
                                key={h}
                                className={`py-1.5 pr-3 font-medium ${
                                    i >= head.length - 2
                                        ? "w-[14%] whitespace-nowrap text-right"
                                        : ""
                                }`}
                            >
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map(r => (
                        <tr key={r.key} className='border-t border-line/70'>
                            {r.cells.map((cell, i) => (
                                <td
                                    key={i}
                                    className={`py-2 pr-3 align-top ${
                                        i >= r.cells.length - 2
                                            ? "whitespace-nowrap text-right tabular-nums text-neutral-900"
                                            : "min-w-0"
                                    } ${i === r.cells.length - 1 ? "font-semibold" : ""}`}
                                >
                                    {cell}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

export default function SalesReport() {
    const [period, setPeriod] = useState(() => periodPreset(DEFAULT_PERIOD_PRESET, crmToday()))
    const [data, setData] = useState(null)
    const [error, setError] = useState("")

    const query = `from=${period.from}&to=${period.to}`

    useEffect(() => {
        const controller = new AbortController()
        setError("")
        setData(null)
        fetch(`/api/crm/analytics/sales?${query}`, { signal: controller.signal })
            .then(async r => {
                if (!r.ok) throw new Error((await r.json()).error || "Ошибка загрузки")
                return r.json()
            })
            .then(setData)
            .catch(err => {
                if (err.name === "AbortError") return
                setError(err.message)
                setData({ managers: [], months: [], counterparties: [], products: [], totals: {} })
            })
        return () => controller.abort()
    }, [query])

    const loading = data === null
    const totals = data?.totals || {}
    const managers = data?.managers || []
    const months = data?.months || []
    const maxManagerAmount = managers.length ? managers[0].amount : 0

    // Рост к предыдущему периоду той же длины. Считаем от нуля осторожно:
    // «+∞ %» в отчёте выглядит как ошибка, поэтому там просто прочерк.
    const delta = useMemo(() => {
        const prev = data?.previous?.amount
        if (prev === undefined || prev === null) return null
        const diff = (totals.amount || 0) - prev
        const pct = prev > 0 ? (diff / prev) * 100 : null
        return { prev, diff, pct }
    }, [data, totals.amount])

    const columns = useMemo(
        () => [
            {
                key: "manager",
                header: "Менеджер",
                sortable: true,
                sortValue: m => m.name,
                render: m => (
                    <div className='min-w-0'>
                        <span className='font-medium text-neutral-900'>{m.name}</span>
                        {m.position && (
                            <span className='block truncate text-xs text-neutral-500'>
                                {m.position}
                            </span>
                        )}
                    </div>
                ),
            },
            {
                key: "amount",
                header: "Продано",
                align: "right",
                sortable: true,
                headerClassName: "whitespace-nowrap",
                cellClassName: "whitespace-nowrap",
                sortValue: m => m.amount,
                render: m => (
                    <span className='font-semibold tabular-nums text-neutral-900'>
                        {formatMoney(m.amount)}
                    </span>
                ),
            },
            {
                key: "share",
                header: "Доля",
                sortable: true,
                sortValue: m => m.share,
                render: m => (
                    <div className='flex min-w-[7rem] items-center gap-2'>
                        <Bar value={m.amount} max={maxManagerAmount} />
                        <span className='w-11 shrink-0 text-right text-xs tabular-nums text-neutral-500'>
                            {m.share} %
                        </span>
                    </div>
                ),
            },
            {
                key: "shipmentsCount",
                header: "Отгрузок",
                align: "right",
                sortable: true,
                headerClassName: "whitespace-nowrap",
                sortValue: m => m.shipmentsCount,
                render: m => (
                    <span className='tabular-nums text-neutral-700'>{m.shipmentsCount}</span>
                ),
            },
            {
                key: "dealsCount",
                header: "Сделок",
                align: "right",
                sortable: true,
                hideable: true,
                sortValue: m => m.dealsCount,
                render: m => <span className='tabular-nums text-neutral-700'>{m.dealsCount}</span>,
            },
            {
                key: "counterpartiesCount",
                header: "Клиентов",
                align: "right",
                sortable: true,
                headerClassName: "whitespace-nowrap",
                sortValue: m => m.counterpartiesCount,
                render: m => (
                    <span className='tabular-nums text-neutral-700'>{m.counterpartiesCount}</span>
                ),
            },
            {
                key: "qty",
                header: "Штук",
                align: "right",
                sortable: true,
                hideable: true,
                defaultHidden: true,
                sortValue: m => m.qty,
                render: m => <span className='tabular-nums text-neutral-700'>{qty(m.qty)}</span>,
            },
            {
                key: "average",
                header: "Средняя отгрузка",
                align: "right",
                sortable: true,
                hideable: true,
                defaultHidden: true,
                headerClassName: "whitespace-nowrap",
                cellClassName: "whitespace-nowrap",
                sortValue: m => (m.shipmentsCount ? m.amount / m.shipmentsCount : 0),
                render: m => (
                    <span className='tabular-nums text-neutral-500'>
                        {m.shipmentsCount ? formatMoney(m.amount / m.shipmentsCount) : "—"}
                    </span>
                ),
            },
        ],
        [maxManagerAmount],
    )

    return (
        <div className='space-y-5'>
            <FilterBar
                actions={
                    // Обычная ссылка, а не Link: файл должен скачиваться, а не
                    // перехватываться клиентской навигацией.
                    <a
                        href={`/api/crm/analytics/sales/export?${query}`}
                        title='Выгрузить отчёт в Excel: свод, месяцы, клиенты, товары и все отгрузки'
                        className='inline-flex h-8 items-center gap-2 rounded-xl border border-line bg-white px-3 text-sm font-medium text-neutral-800 shadow-sm transition-colors hover:bg-surface_muted'
                    >
                        <LuDownload className='h-4 w-4 text-brand_main' />
                        Excel
                    </a>
                }
            >
                <PeriodFilter value={period} onChange={setPeriod} />
            </FilterBar>

            <div className='grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4'>
                <StatCard
                    size='sm'
                    label='Продано за период'
                    value={loading ? "…" : shortMoney(totals.amount)}
                    hint={
                        loading
                            ? undefined
                            : delta
                              ? `${delta.diff >= 0 ? "+" : "−"}${shortMoney(Math.abs(delta.diff))}${
                                    delta.pct === null
                                        ? ""
                                        : ` (${delta.diff >= 0 ? "+" : "−"}${Math.abs(delta.pct).toLocaleString("ru-RU", { maximumFractionDigits: 1 })} %)`
                                } к прошлому периоду`
                              : formatPeriodLabel(period)
                    }
                    icon={delta && delta.diff < 0 ? LuTrendingDown : LuTrendingUp}
                    tone={delta && delta.diff < 0 ? "warn" : "brand"}
                />
                <StatCard
                    size='sm'
                    label='Отгрузок'
                    value={loading ? "…" : totals.shipmentsCount || 0}
                    hint={
                        loading
                            ? undefined
                            : `${totals.dealsCount || 0} сделок · средняя ${formatMoney(totals.averageShipment)}`
                    }
                    icon={LuTruck}
                />
                <StatCard
                    size='sm'
                    label='Клиентов'
                    value={loading ? "…" : totals.counterpartiesCount || 0}
                    hint={loading ? undefined : `${totals.managersCount || 0} менеджеров с продажами`}
                    icon={LuUsers}
                />
                <StatCard
                    size='sm'
                    label='Продано штук'
                    value={loading ? "…" : qty(totals.qty)}
                    hint={loading ? undefined : `${totals.productsCount || 0} позиций номенклатуры`}
                    icon={LuPackage}
                />
            </div>

            {error && (
                <p className='rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700'>
                    {error}
                </p>
            )}

            {/* Проведённая отгрузка без фактической даты в период не попадает —
                молчать об этом нельзя, иначе деньги просто исчезают из отчёта. */}
            {!loading && totals.undatedCount > 0 && (
                <p className='flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800'>
                    <LuAlertTriangle className='mt-0.5 h-4 w-4 shrink-0' />
                    <span>
                        {totals.undatedCount} проведённых отгрузок без фактической даты — в отчёт
                        они не попали. Проставьте дату в карточке отгрузки.
                    </span>
                </p>
            )}

            <section className='space-y-3'>
                <SectionHeading
                    icon={LuWallet}
                    title='Продажи менеджеров'
                    count={loading ? null : managers.length}
                    hint='строка раскрывается — клиенты, товары и отгрузки менеджера'
                />

                <div className='space-y-3 md:hidden'>
                    {loading && <CardListSkeleton />}
                    {managers.map(m => (
                        <MobileCard key={m.id || m.name}>
                            <div className='flex items-start justify-between gap-2'>
                                <span className='font-medium text-neutral-900'>{m.name}</span>
                                <span className='shrink-0 text-sm font-semibold tabular-nums text-neutral-900'>
                                    {formatMoney(m.amount)}
                                </span>
                            </div>
                            <div className='mt-2 space-y-1'>
                                <CardRow label='Доля'>{m.share} %</CardRow>
                                <CardRow label='Отгрузок'>{m.shipmentsCount}</CardRow>
                                <CardRow label='Клиентов'>{m.counterpartiesCount}</CardRow>
                            </div>
                        </MobileCard>
                    ))}
                </div>

                <div className='hidden md:block'>
                    <DataTable
                        columns={columns}
                        rows={managers}
                        loading={loading}
                        getRowId={m => m.id || m.name}
                        initialSort={{ key: "amount", dir: "desc" }}
                        pageSize={50}
                        expandable={{ render: m => <ManagerDetails manager={m} /> }}
                        empty={
                            <EmptyState
                                icon={LuBoxes}
                                title='За период продаж нет'
                                hint='В выбранном периоде нет ни одной проведённой отгрузки. Измените период или проведите отгрузки в сделках.'
                            />
                        }
                    />
                </div>
            </section>

            {!loading && months.length > 1 && (
                <section className='space-y-3'>
                    <SectionHeading
                        icon={LuBarChart3}
                        title='Динамика по месяцам'
                        hint={formatPeriodLabel(period)}
                    />
                    <MonthlyChart months={months} />
                </section>
            )}
        </div>
    )
}
