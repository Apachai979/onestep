"use client"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
    LuDownload,
    LuExternalLink,
    LuFileText,
    LuMail,
    LuPaperclip,
    LuUsers,
} from "react-icons/lu"
import PeriodFilter from "@/components/crm/PeriodFilter"
import { attachmentLinkProps, isPreviewableMime } from "@/lib/crm/attachment"
import { DEAL_STATUS_COLORS, DEAL_STATUS_LABELS } from "@/lib/crm/deal"
import { crmToday, formatCrmDateTime, isYmd } from "@/lib/crm/datetime"
import { formatPeriodLabel, periodPreset } from "@/lib/crm/period"
import { useUrlFilters } from "@/lib/crm/url-state"
import {
    CardListSkeleton,
    CardRow,
    DataTable,
    EmptyState,
    FilterBar,
    FilterPicker,
    FilterSelect,
    MobileCard,
    StatCard,
} from "@/components/crm/ui"

// КП — оперативный документооборот: годовой срез по нему читается хуже
// месячного, поэтому реестр открывается месяцем, как «Задачи» и «Активность»,
// а не годом, как «Продажи».
const PROPOSALS_PERIOD_PRESET = "month"

// Отбор и период живут в адресе (см. lib/crm/url-state.js): из реестра уходят
// в карточку сделки, и на «Назад» менеджер должен вернуться к тому же списку,
// а не к чистому месяцу. Период здесь такой же фильтр, как остальные: без него
// восстановленный отбор показывал бы КП не за тот отрезок.
//
// Дефолт периода — пустые строки, а не готовые даты: пресет считается от
// сегодняшнего дня, и в адрес его писать незачем, пока менеджер период не
// трогал (чистый /crm/analytics/proposals таким и остаётся).
const DEFAULT_FILTERS = {
    from: "",
    to: "",
    managerId: "",
    counterpartyId: "",
    status: "",
}

// Номер КП — он же ссылка на сам файл, если КП сохраняли в документы сделки:
// из реестра чаще всего нужен именно документ. Пропсы ссылки общие с
// документами карточки (attachmentLinkProps): PDF открывается вкладкой в
// просмотрщике браузера, всё прочее скачивается — иконка подписывает, что
// именно произойдёт, иначе номер выглядит просто выделенным текстом.
// Только отправленное письмом КП файла в CRM не оставило — там номер текстом.
function ProposalNumber({ row }) {
    const label = row.number || "без номера"
    if (!row.attachmentId) return <span className='font-medium text-neutral-900'>{label}</span>

    const inline = isPreviewableMime(row.mimeType)
    const Icon = inline ? LuExternalLink : LuDownload
    return (
        <a
            {...attachmentLinkProps({ id: row.attachmentId, mimeType: row.mimeType })}
            title={`${inline ? "Открыть" : "Скачать"} ${row.fileName || "КП"}`}
            className='inline-flex items-center gap-1 font-medium text-brand_main hover:underline'
        >
            {label}
            <Icon className='h-3.5 w-3.5 shrink-0 text-brand_main/60' />
        </a>
    )
}

// Отметки следа: по ним видно, что с КП сделали. «В документах» без
// «отправлено» — сформировали и не отправили из CRM (могли отправить из личной
// почты, такого следа у нас нет).
function Marks({ row }) {
    return (
        <span className='inline-flex flex-wrap items-center gap-1'>
            {row.saved && (
                <span
                    title={row.fileName || "Файл сохранён в документы сделки"}
                    className='inline-flex items-center gap-1 rounded-full bg-neutral-100 px-1.5 py-px text-[10px] font-medium text-neutral-700'
                >
                    <LuPaperclip className='h-3 w-3' />в документах
                </span>
            )}
            {row.sent && (
                <span
                    title={
                        row.sentTo.length
                            ? `Отправлено: ${row.sentTo.join(", ")}`
                            : "Отправлено письмом"
                    }
                    className='inline-flex items-center gap-1 rounded-full bg-green-100 px-1.5 py-px text-[10px] font-medium text-green-800'
                >
                    <LuMail className='h-3 w-3' />
                    отправлено
                    {row.sentCount > 1 && <span className='tabular-nums'>×{row.sentCount}</span>}
                </span>
            )}
        </span>
    )
}

export default function ProposalsReport() {
    // Дебаунс не нужен — текстовых полей в панели нет, все значения приходят
    // готовыми из выпадашек, поэтому всё применяем через apply, сразу.
    const { filters, applied, apply } = useUrlFilters(DEFAULT_FILTERS)

    const defaultPeriod = useMemo(() => periodPreset(PROPOSALS_PERIOD_PRESET, crmToday()), [])
    // Мусорные даты в адресе не роняют отчёт и не показываются полями —
    // ссылкой на реестр делятся, и битый параметр в ней откатывается к
    // умолчанию (ровно так же ведёт себя parsePeriodParams на сервере).
    const period = useMemo(() => {
        const { from, to } = applied
        if (isYmd(from) && isYmd(to) && from <= to) return { from, to }
        return defaultPeriod
    }, [applied, defaultPeriod])

    // Прошлый ответ держим на экране, пока едет новый: списки значений в
    // чипсах приезжают вместе с данными, и обнуление данных на каждый отбор
    // гасило бы подпись только что выбранного фильтра.
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    // Период берём разобранный (period), а не сырой из адреса: битые даты
    // должны уезжать на сервер уже подменёнными на умолчание, иначе экран и
    // Excel считались бы за разные отрезки.
    const query = useMemo(() => {
        const params = new URLSearchParams({ from: period.from, to: period.to })
        for (const key of ["managerId", "counterpartyId", "status"]) {
            if (applied[key]) params.set(key, applied[key])
        }
        return params.toString()
    }, [period, applied])

    useEffect(() => {
        const controller = new AbortController()
        setError("")
        setLoading(true)
        fetch(`/api/crm/analytics/proposals?${query}`, { signal: controller.signal })
            .then(async r => {
                if (!r.ok) throw new Error((await r.json()).error || "Ошибка загрузки")
                return r.json()
            })
            .then(next => {
                setData(next)
                setLoading(false)
            })
            .catch(err => {
                if (err.name === "AbortError") return
                setError(err.message)
                setData({ rows: [], totals: {}, filters: {} })
                setLoading(false)
            })
        return () => controller.abort()
    }, [query])

    const rows = data?.rows || []
    const totals = data?.totals || {}
    const options = data?.filters || {}

    const managerOptions = useMemo(
        () => (options.managers || []).map(o => ({ id: o.value, label: o.label })),
        [options.managers],
    )
    const clientOptions = useMemo(
        () => (options.counterparties || []).map(o => ({ id: o.value, label: o.label })),
        [options.counterparties],
    )
    const statusOptions = useMemo(
        () =>
            (options.statuses || []).map(s => ({
                value: s,
                label: DEAL_STATUS_LABELS[s] || s,
            })),
        [options.statuses],
    )

    function setFilter(key) {
        return value => apply({ ...filters, [key]: value })
    }

    function setPeriod(next) {
        apply({ ...filters, from: next.from || "", to: next.to || "" })
    }

    const columns = useMemo(
        () => [
            {
                key: "at",
                header: "Сформировано",
                sortable: true,
                headerClassName: "whitespace-nowrap",
                sortValue: r => (r.at ? new Date(r.at).getTime() : 0),
                render: r => (
                    <span className='whitespace-nowrap text-neutral-700'>
                        {formatCrmDateTime(r.at)}
                    </span>
                ),
            },
            {
                key: "number",
                header: "Номер",
                sortable: true,
                sortValue: r => r.number,
                render: r => (
                    <div className='min-w-0'>
                        <ProposalNumber row={r} />
                        {r.documentDate && (
                            <span
                                className='block text-xs text-neutral-400'
                                title='Дата, напечатанная в самом документе'
                            >
                                от {r.documentDate}
                            </span>
                        )}
                    </div>
                ),
            },
            {
                key: "deal",
                header: "Сделка",
                sortable: true,
                sortValue: r => r.dealTitle,
                render: r => (
                    <Link
                        href={`/crm/deals/${r.dealId}`}
                        className='block min-w-0 truncate font-medium text-neutral-900 hover:text-brand_main'
                        title={r.dealTitle || "Сделка без названия"}
                    >
                        {r.dealTitle || "Сделка без названия"}
                    </Link>
                ),
            },
            {
                key: "client",
                header: "Клиент",
                sortable: true,
                sortValue: r => r.counterpartyName,
                render: r =>
                    r.counterpartyId ? (
                        <Link
                            href={`/crm/counterparties/${r.counterpartyId}`}
                            className='block min-w-0 truncate text-neutral-700 hover:text-brand_main'
                            title={r.counterpartyName}
                        >
                            {r.counterpartyName}
                        </Link>
                    ) : (
                        <span className='text-neutral-400'>—</span>
                    ),
            },
            {
                key: "status",
                header: "Статус сделки",
                sortable: true,
                hideable: true,
                headerClassName: "whitespace-nowrap",
                sortValue: r => DEAL_STATUS_LABELS[r.dealStatus] || r.dealStatus,
                render: r => (
                    <span
                        className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${
                            DEAL_STATUS_COLORS[r.dealStatus] || "bg-neutral-100 text-neutral-600"
                        }`}
                    >
                        {DEAL_STATUS_LABELS[r.dealStatus] || r.dealStatus}
                    </span>
                ),
            },
            {
                key: "manager",
                header: "Менеджер",
                sortable: true,
                sortValue: r => r.managerName,
                render: r => {
                    // КП мог сформировать не менеджер сделки — коллега на
                    // подмене. Отчёт считает КП менеджеру сделки (как продажи
                    // в «Продажах менеджеров»), а расхождение подписывает.
                    const others = r.authors.filter(a => a && a !== r.managerName)
                    return (
                        <div className='min-w-0'>
                            <span className='block truncate text-neutral-700'>
                                {r.managerName || "—"}
                            </span>
                            {others.length > 0 && (
                                <span className='block truncate text-xs text-neutral-400'>
                                    сформировал {others.join(", ")}
                                </span>
                            )}
                        </div>
                    )
                },
            },
            {
                key: "marks",
                header: "Отметки",
                hideable: true,
                // По умолчанию выключена: реестр читают по номерам и клиентам,
                // а «в документах / отправлено» — деталь под конкретный вопрос
                // («что из выставленного не ушло клиенту»). Те же цифры уже
                // стоят плитками сверху, поэтому в колонке они не обязательны.
                defaultHidden: true,
                render: r => <Marks row={r} />,
            },
        ],
        [],
    )

    return (
        <div className='space-y-5'>
            <FilterBar
                actions={
                    // Обычная ссылка, а не Link: файл должен скачиваться, а не
                    // перехватываться клиентской навигацией.
                    <a
                        href={`/api/crm/analytics/proposals/export?${query}`}
                        title='Выгрузить реестр КП в Excel — с тем же отбором и без ограничения на число строк'
                        className='inline-flex h-8 items-center gap-2 rounded-xl border border-line bg-white px-3 text-sm font-medium text-neutral-800 shadow-sm transition-colors hover:bg-surface_muted'
                    >
                        <LuDownload className='h-4 w-4 text-brand_main' />
                        Excel
                    </a>
                }
            >
                <PeriodFilter value={period} onChange={setPeriod} />
                <FilterPicker
                    label='Менеджер'
                    value={filters.managerId}
                    onChange={setFilter("managerId")}
                    options={managerOptions}
                />
                <FilterPicker
                    label='Клиент'
                    value={filters.counterpartyId}
                    onChange={setFilter("counterpartyId")}
                    options={clientOptions}
                />
                <FilterSelect
                    label='Статус сделки'
                    value={filters.status}
                    onChange={setFilter("status")}
                    options={statusOptions}
                />
            </FilterBar>

            <div className='grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4'>
                <StatCard
                    size='sm'
                    label='КП за период'
                    value={loading && !data ? "…" : totals.total || 0}
                    hint={
                        loading && !data
                            ? undefined
                            : `${totals.managersCount || 0} менеджеров · ${formatPeriodLabel(period)}`
                    }
                    icon={LuFileText}
                    tone='brand'
                />
                <StatCard
                    size='sm'
                    label='Отправлено письмом'
                    value={loading && !data ? "…" : totals.sent || 0}
                    hint={loading && !data ? undefined : "ушли клиенту из CRM"}
                    icon={LuMail}
                    tone='success'
                />
                <StatCard
                    size='sm'
                    label='Без отправки из CRM'
                    value={loading && !data ? "…" : totals.notSent || 0}
                    hint={
                        loading && !data
                            ? undefined
                            : "сформировали и сохранили — письма из CRM не было"
                    }
                    icon={LuPaperclip}
                    tone='neutral'
                />
                <StatCard
                    size='sm'
                    label='Клиентов'
                    value={loading && !data ? "…" : totals.counterpartiesCount || 0}
                    hint={loading && !data ? undefined : `по ${totals.dealsCount || 0} сделкам`}
                    icon={LuUsers}
                    tone='neutral'
                />
            </div>

            {error && (
                <p className='rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700'>
                    {error}
                </p>
            )}

            <div className='space-y-3 md:hidden'>
                {loading && !data && <CardListSkeleton />}
                {rows.map(r => (
                    <MobileCard key={r.key}>
                        <div className='flex items-start justify-between gap-2'>
                            <ProposalNumber row={r} />
                            <span className='shrink-0 text-xs text-neutral-500'>
                                {formatCrmDateTime(r.at)}
                            </span>
                        </div>
                        <div className='mt-2 space-y-1'>
                            <CardRow label='Сделка'>
                                <Link
                                    href={`/crm/deals/${r.dealId}`}
                                    className='text-brand_main hover:underline'
                                >
                                    {r.dealTitle || "Сделка без названия"}
                                </Link>
                            </CardRow>
                            <CardRow label='Клиент'>{r.counterpartyName || "—"}</CardRow>
                            <CardRow label='Статус'>
                                {DEAL_STATUS_LABELS[r.dealStatus] || r.dealStatus}
                            </CardRow>
                            <CardRow label='Менеджер'>{r.managerName || "—"}</CardRow>
                        </div>
                        <div className='mt-2'>
                            <Marks row={r} />
                        </div>
                    </MobileCard>
                ))}
            </div>

            <div className='hidden md:block'>
                <DataTable
                    columns={columns}
                    rows={rows}
                    loading={loading && !data}
                    getRowId={r => r.key}
                    initialSort={{ key: "at", dir: "desc" }}
                    pageSize={50}
                    searchable
                    searchPlaceholder='Номер, сделка, клиент…'
                    searchAccessor={r =>
                        [r.number, r.dealTitle, r.counterpartyName, r.managerName]
                            .filter(Boolean)
                            .join(" ")
                    }
                    empty={
                        <EmptyState
                            icon={LuFileText}
                            title='За период КП не выставляли'
                            hint='Измените период или снимите отбор. КП, которое просто скачали, следа в CRM не оставляет.'
                        />
                    }
                />
            </div>

            {/* Длинный реестр режем на сервере — молчать об этом нельзя,
                иначе список выглядит полным. */}
            {data?.truncated && (
                <p className='text-xs text-neutral-400'>
                    Показаны первые {rows.length} из {data.rowsCount} КП за период — полный реестр
                    в Excel-выгрузке.
                </p>
            )}
        </div>
    )
}
