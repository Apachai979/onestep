"use client"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import { LuArrowUpRight, LuDownload, LuExternalLink, LuGavel, LuPlus } from "react-icons/lu"
import { formatMoney } from "@/lib/crm/format"
import { crmYmd, daysBetweenYmd, formatCrmDate } from "@/lib/crm/datetime"
import {
    TENDER_DECISION_LABELS,
    tenderCustomerLabel,
    tenderlandCardUrl,
} from "@/lib/crm/tender-map"
import TenderImportDialog from "@/components/crm/TenderImportDialog"
import TenderDuplicateDialog from "@/components/crm/TenderDuplicateDialog"
import {
    Badge,
    Button,
    CardListSkeleton,
    CardRow,
    DataTable,
    EmptyState,
    FilterBar,
    FilterSearch,
    MobileCard,
    Tabs,
    useConfirm,
    useToast,
} from "@/components/crm/ui"

// «Просрочены» — это те же неразобранные закупки, у которых приём заявок уже
// закрыт: решением менеджера (decision) они не отличаются, отличаются датой.
// Отдельной вкладкой они не мозолят глаза в работе, но и не пропадают: заявку
// могли подать, а отметить в CRM забыть.
const TABS = [
    { key: "NEW", label: "Не разобраны" },
    { key: "EXPIRED", label: "Просрочены" },
    { key: "TAKEN", label: "Участвуем" },
    { key: "SKIPPED", label: "Мимо" },
    { key: "ALL", label: "Все" },
]

/**
 * Срок подачи заявок — то, ради чего этот список и открывают: закупка, до
 * которой остались сутки, должна читаться с одного взгляда.
 */
function deadlineTone(endDate) {
    if (!endDate) return { label: "Без срока", tone: "text-neutral-400" }
    const days = daysBetweenYmd(crmYmd(), crmYmd(new Date(endDate)))
    const date = formatCrmDate(endDate)
    if (days === null) return { label: date, tone: "text-neutral-700" }
    if (days < 0) return { label: `${date} · истёк`, tone: "text-neutral-400" }
    if (days === 0) return { label: `${date} · сегодня`, tone: "text-red-600 font-semibold" }
    if (days === 1) return { label: `${date} · завтра`, tone: "text-red-600" }
    if (days <= 3) return { label: `${date} · ${days} дн.`, tone: "text-amber-600" }
    return { label: date, tone: "text-neutral-700" }
}

const EMPTY_TITLES = {
    NEW: "Новых закупок нет",
    EXPIRED: "Всё разобрано вовремя",
}

const EMPTY_HINTS = {
    NEW: "Нажмите «Обновить закупки» — CRM заберёт свежие из автопоиска «CRM: воронка закупок».",
    EXPIRED: "Здесь оказываются закупки, у которых приём заявок закрылся, пока их не разобрали.",
}

/**
 * Приём заявок закрыт — закупка ушла на вкладку «Просрочены». Граница та же,
 * что на сервере: вчера и раньше (у сегодняшней закупки заявку ещё принимают).
 */
function isExpiredTender(tender) {
    if (!tender?.endDate) return false
    const days = daysBetweenYmd(crmYmd(), crmYmd(new Date(tender.endDate)))
    return days !== null && days < 0
}

/** На какой вкладке лежит закупка — нужно, чтобы навестись на неё после импорта. */
function tenderTab(tender) {
    if (tender.decision !== "NEW") return tender.decision || "NEW"
    return isExpiredTender(tender) ? "EXPIRED" : "NEW"
}

/**
 * Ссылка наружу — на площадку и в карточку Тендерлэнда. Обе нужны: в CRM лежит
 * выжимка, а документация закупки и протоколы остаются по ту сторону. Клик по
 * ссылке не должен считаться кликом по строке таблицы.
 */
function OutLink({ href, children }) {
    return (
        <a
            href={href}
            target='_blank'
            rel='noreferrer'
            onClick={e => e.stopPropagation()}
            className='inline-flex items-center gap-1 text-brand_main hover:underline'
        >
            {children} <LuExternalLink className='h-3 w-3' />
        </a>
    )
}

/** Позиции КТРУ — по ним менеджер отличает наш набор от чужого. */
function ktruList(value) {
    if (!value) return []
    return value.split("\n").filter(Boolean)
}

export default function TendersList({ isAdmin = false }) {
    const router = useRouter()
    const toast = useToast()
    const confirm = useConfirm()

    const [tab, setTab] = useState("NEW")
    const [items, setItems] = useState(null)
    const [counts, setCounts] = useState({})
    const [q, setQ] = useState("")
    const [qApplied, setQApplied] = useState("")
    const [error, setError] = useState("")
    const [syncing, setSyncing] = useState(false)
    const [importOpen, setImportOpen] = useState(false)
    const [busyId, setBusyId] = useState(null)
    const [refreshTick, setRefreshTick] = useState(0)
    // Найденные сервером сделки, в которых эта закупка, похоже, уже ведётся:
    // { tender, candidates }. Развилку разбирает TenderDuplicateDialog.
    const [duplicates, setDuplicates] = useState(null)

    useEffect(() => {
        const t = setTimeout(() => setQApplied(q.trim()), 300)
        return () => clearTimeout(t)
    }, [q])

    useEffect(() => {
        const controller = new AbortController()
        // Просроченные — те же «не разобраны», отобранные по сроку.
        const params = new URLSearchParams({ decision: tab === "EXPIRED" ? "NEW" : tab })
        if (tab === "EXPIRED") params.set("expired", "1")
        if (qApplied) params.set("search", qApplied)

        setError("")
        setItems(null)
        fetch(`/api/crm/tenders?${params.toString()}`, { signal: controller.signal })
            .then(async r => {
                if (!r.ok) throw new Error((await r.json()).error || "Ошибка загрузки")
                return r.json()
            })
            .then(data => {
                setItems(data.items || [])
                setCounts(data.counts || {})
            })
            .catch(err => {
                if (err.name !== "AbortError") setError(err.message)
            })
        return () => controller.abort()
    }, [tab, qApplied, refreshTick])

    async function sync() {
        setSyncing(true)
        try {
            const res = await fetch("/api/crm/tenders/sync", { method: "POST" })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) {
                toast.error(data?.error || "Не удалось обновить закупки", {
                    title: "Ошибка Tenderland",
                })
                return
            }
            const parts = [`Новых: ${data.created}`]
            // Изменения приезжают из обоих шагов: выгрузка обновляет закупки с
            // открытым приёмом заявок, сверка — те, что уже в работе. Менеджеру
            // важно одно число: сколько карточек сдвинулось на площадке.
            const changed = (data.updated || 0) + (data.refreshed?.updated || 0)
            const dealsFixed = (data.deals || 0) + (data.refreshed?.deals || 0)
            if (changed) parts.push(`изменилось: ${changed}`)
            if (dealsFixed) parts.push(`сделок поправлено: ${dealsFixed}`)
            if (!changed) parts.push(`сверено: ${data.total || 0}`)
            // Разбор чистится тем же прогоном: закупки, у которых приём заявок
            // закрылся давно, уходят в «Мимо» сами.
            if (data.expired) parts.push(`закрыто по сроку: ${data.expired}`)
            // Автопоиск отфильтрован по открытому приёму заявок и в кап
            // выгрузки укладываться обязан. Не уложился — фильтр в кабинете
            // сняли или расширили, и часть закупок осталась незабранной.
            if (data.truncated) {
                parts.push("выгрузка переполнена — проверьте фильтр автопоиска")
            }
            toast.success(parts.join(" · "), { title: "Закупки обновлены" })
            setRefreshTick(x => x + 1)
        } catch (err) {
            toast.error(err.message || "Сбой сети")
        } finally {
            setSyncing(false)
        }
    }

    /**
     * Закупка, добавленная вручную по номеру. Показываем её сразу: ставим
     * поиск по номеру и открываем вкладку, где она лежит, — иначе одна запись
     * потеряется среди сотни новых, и менеджер решит, что импорт не сработал.
     */
    function afterImport(result) {
        const tender = result?.tender
        setImportOpen(false)
        if (!tender) return

        if (result.status === "EXISTS") {
            toast.info("Эта закупка уже есть в списке")
        } else {
            toast.success("Закупка добавлена в разбор", { title: "Закупка найдена" })
        }

        // Закупку по номеру заводят и задним числом — тогда её вкладка
        // «Просрочены», а не «Не разобраны».
        setTab(tenderTab(tender))
        const number = tender.regNumber || tender.tenderlandId || ""
        setQ(number)
        setQApplied(number)
        setRefreshTick(x => x + 1)
    }

    /**
     * Решение по закупке. Для «Участвуем» есть две добавки:
     *   { dealId } — закупка едет в уже существующую сделку;
     *   { force }  — новая сделка вопреки найденным дублям.
     * Без них сервер сначала проверяет, не ведётся ли эта закупка уже, и на
     * найденных кандидатов отвечает 409 — тогда открывается диалог развилки.
     */
    const decide = useCallback(async function decide(tender, decision, options = {}) {
        setBusyId(tender.id)
        try {
            const res = await fetch(`/api/crm/tenders/${tender.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ decision, ...options }),
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) {
                // Сделки, в которых эта закупка, возможно, уже ведётся. Ошибкой
                // это не показываем: менеджеру не запрещают завести новую, у
                // него спрашивают, не та ли это самая продажа.
                if (res.status === 409 && data?.candidates?.length) {
                    setDuplicates({ tender, candidates: data.candidates })
                    return
                }
                toast.error(data?.error || "Не удалось сохранить решение")
                return
            }
            if (decision === "TAKEN" && data.dealId) {
                setDuplicates(null)
                if (data.linked) {
                    // Что именно закупка изменила в чужой сделке — менеджер
                    // должен увидеть сразу. Замена важнее: она означает, что
                    // прежняя процедура отыграна и карточка переехала на новую.
                    const parts = []
                    if (data.replaced?.length) {
                        parts.push(`заменено (прежняя закупка отыграна): ${data.replaced.join(", ")}`)
                    }
                    if (data.filled?.length) parts.push(`заполнено: ${data.filled.join(", ")}`)
                    toast.success(
                        parts.length
                            ? parts.join(" · ")
                            : "Данные сделки уже заполнены — ничего не меняли",
                        { title: `Закупка привязана к сделке «${data.dealTitle}»` },
                    )
                    router.push(`/crm/deals/${data.dealId}`)
                    return
                }
                // Клиента подставляет сервер, и менеджер должен увидеть, кого именно:
                // дистрибьютора из проекта по этому ЛПУ или нашу организацию.
                const CLIENT_SOURCE_HINTS = {
                    PROJECT_DISTRIBUTOR: data.projectName
                        ? `клиент — ${data.clientName} из проекта «${data.projectName}»`
                        : `клиент — ${data.clientName} из проекта`,
                    OWN: `поставляем сами: клиент — ${data.clientName}`,
                    CUSTOMER: `клиент — ${data.clientName}`,
                    MANUAL: `клиент — ${data.clientName}`,
                }
                toast.success(CLIENT_SOURCE_HINTS[data.clientSource] || "Сделка создана", {
                    title: "Сделка создана",
                })
                router.push(`/crm/deals/${data.dealId}`)
                return
            }
            // Подтверждения у «Мимо» нет — решение отменяемое и его принимают
            // пачкой; вместо диалога тост говорит, где закупку искать. Отмена
            // участия — случай обратный: там диалог есть, а тост напоминает,
            // что сделку сервер не тронул и с ней ещё разбираться.
            if (decision === "SKIPPED") {
                if (data.unlinkedDealId) {
                    toast.info("Сделка осталась — отмените или заархивируйте её в карточке", {
                        title: "Участие в закупке отменено",
                    })
                } else {
                    toast.info("Вернуть её в разбор можно на вкладке «Мимо»", {
                        title: "Закупка ушла в отказы",
                    })
                }
            }
            setRefreshTick(x => x + 1)
        } catch (err) {
            toast.error(err.message || "Сбой сети")
        } finally {
            setBusyId(null)
        }
    }, [router, toast])

    /**
     * Ошибочно взятая закупка: не та процедура, дубль, перепутали карточку.
     * Удалять её нельзя — закупка остаётся историей, поэтому она просто уходит
     * в «Мимо». Вместе с решением отваливается привязка к сделке (иначе
     * отменённая процедура так и висела бы в карточке и на доске аукционов), а
     * сама сделка остаётся: её статус ставит человек, а не автоматика.
     *
     * Диалог здесь, в отличие от обычного «Мимо», обязателен: отменяется чужое
     * решение и уже заведённая сделка.
     */
    const cancelParticipation = useCallback(
        async function cancelParticipation(tender) {
            const ok = await confirm({
                title: "Отменить участие в закупке?",
                description: tender.deal
                    ? `Закупка уйдёт в «Мимо» и отвяжется от сделки «${tender.deal.title}». Сама сделка останется — отмените или заархивируйте её в карточке.`
                    : "Закупка уйдёт на вкладку «Мимо». Вернуть её в разбор можно оттуда.",
                confirmText: "Отменить участие",
                variant: "danger",
            })
            if (ok) decide(tender, "SKIPPED")
        },
        [confirm, decide],
    )

    const columns = useMemo(
        () => [
            {
                key: "endDate",
                header: "Приём заявок до",
                sortable: true,
                sortValue: t => (t.endDate ? Date.parse(t.endDate) : Number.MAX_SAFE_INTEGER),
                render: t => {
                    const { label, tone } = deadlineTone(t.endDate)
                    return <span className={`whitespace-nowrap text-sm ${tone}`}>{label}</span>
                },
            },
            {
                key: "name",
                header: "Закупка",
                render: t => (
                    <div className='max-w-xl space-y-1'>
                        <div className='font-medium text-neutral-900'>{t.name}</div>
                        <div className='flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500'>
                            {t.regNumber ? <span>№ {t.regNumber}</span> : null}
                            {/* Автопоиск её не приносил — её завели по номеру
                                руками, и это стоит видеть при разборе. */}
                            {t.source === "MANUAL" ? (
                                <span className='text-neutral-400'>добавлена вручную</span>
                            ) : null}
                            {t.typeName ? <span>{t.typeName}</span> : null}
                            {t.region ? <span>{t.region}</span> : null}
                            {/* Обе ссылки — одним блоком: врозь они переносятся
                                по разным строкам и читаются как разные вещи. */}
                            <span className='inline-flex items-center gap-3 whitespace-nowrap'>
                                {t.sourceLink ? (
                                    <OutLink href={t.sourceLink}>источник</OutLink>
                                ) : null}
                                {tenderlandCardUrl(t.tenderlandId) ? (
                                    <OutLink href={tenderlandCardUrl(t.tenderlandId)}>
                                        Тендерлэнд
                                    </OutLink>
                                ) : null}
                            </span>
                        </div>
                        {ktruList(t.ktru).length ? (
                            <div className='flex flex-wrap gap-1 pt-0.5'>
                                {ktruList(t.ktru)
                                    .slice(0, 3)
                                    .map(k => (
                                        <span
                                            key={k}
                                            className='rounded bg-neutral-100 px-1.5 py-0.5 text-[11px] text-neutral-600'
                                            title={k}
                                        >
                                            {k.length > 70 ? `${k.slice(0, 70)}…` : k}
                                        </span>
                                    ))}
                                {ktruList(t.ktru).length > 3 ? (
                                    <span className='text-[11px] text-neutral-400'>
                                        +{ktruList(t.ktru).length - 3}
                                    </span>
                                ) : null}
                            </div>
                        ) : null}
                        {t.winnerName || t.refreshedAt || t.skipReason ? (
                            <div className='flex flex-wrap items-center gap-2 pt-0.5 text-xs'>
                                {/* Причина отказа: по ней видно, закрыл закупку
                                    коллега или автоматика по истечении срока. */}
                                {t.skipReason ? (
                                    <span className='text-neutral-500'>{t.skipReason}</span>
                                ) : null}
                                {t.winnerName ? (
                                    <Badge tone={t.winnerIsOwn ? "success" : "neutral"}>
                                        {t.winnerIsOwn
                                            ? "Победа: наше юрлицо"
                                            : `Победитель: ${t.winnerName}`}
                                    </Badge>
                                ) : null}
                                {t.refreshedAt ? (
                                    <span className='text-neutral-400'>
                                        обновлено {formatCrmDate(t.refreshedAt)}
                                    </span>
                                ) : null}
                            </div>
                        ) : null}
                    </div>
                ),
            },
            {
                key: "beginPrice",
                header: "НМЦК",
                align: "right",
                sortable: true,
                sortValue: t => Number(t.beginPrice) || 0,
                render: t =>
                    Number(t.beginPrice) > 0 ? (
                        formatMoney(t.beginPrice)
                    ) : (
                        <span className='text-neutral-400'>не указана</span>
                    ),
            },
            {
                key: "customerName",
                header: "Заказчик",
                render: t => (
                    <div className='max-w-xs text-sm text-neutral-700'>
                        <div title={t.customerName || undefined}>
                            {tenderCustomerLabel(t) || "—"}
                        </div>
                        {t.customerInn ? (
                            <div className='text-xs text-neutral-400'>ИНН {t.customerInn}</div>
                        ) : null}
                        {/* По этому заказчику уже ведётся аукционная сделка —
                            чаще всего её завёл коллега после разговора с врачом,
                            и закупку надо привязать к ней, а не заводить вторую.
                            Предупреждение видно до нажатия «Участвуем». */}
                        {t.openDeal ? (
                            <div className='pt-1 text-xs text-amber-600'>
                                уже есть сделка
                                {t.openDeal.count > 1 ? ` (${t.openDeal.count})` : ""}
                                {t.openDeal.managerName ? ` · ${t.openDeal.managerName}` : ""}
                            </div>
                        ) : null}
                    </div>
                ),
                hideable: true,
            },
            {
                key: "actions",
                header: "",
                align: "right",
                render: t => {
                    if (t.decision === "TAKEN") {
                        return (
                            <div className='flex justify-end gap-2'>
                                {t.dealId ? (
                                    <Button
                                        variant='ghost'
                                        size='sm'
                                        title='Открыть сделку'
                                        href={`/crm/deals/${t.dealId}`}
                                        onClick={e => e.stopPropagation()}
                                    >
                                        Сделка
                                        <LuArrowUpRight className='h-4 w-4' />
                                    </Button>
                                ) : (
                                    <Badge tone='neutral'>Участвуем</Badge>
                                )}
                                {/* Разбор ошибок — дело администратора: тот же
                                    запрет стоит и на сервере. */}
                                {isAdmin ? (
                                    <Button
                                        variant='ghost'
                                        size='sm'
                                        title='Закупку взяли по ошибке — вернуть её в «Мимо»'
                                        disabled={busyId === t.id}
                                        onClick={e => {
                                            e.stopPropagation()
                                            cancelParticipation(t)
                                        }}
                                    >
                                        Мимо
                                    </Button>
                                ) : null}
                            </div>
                        )
                    }
                    if (t.decision === "SKIPPED") {
                        return (
                            <Button
                                variant='ghost'
                                size='sm'
                                disabled={busyId === t.id}
                                onClick={e => {
                                    e.stopPropagation()
                                    decide(t, "NEW")
                                }}
                            >
                                Вернуть
                            </Button>
                        )
                    }
                    return (
                        <div className='flex justify-end gap-2'>
                            <Button
                                size='sm'
                                disabled={busyId === t.id}
                                onClick={e => {
                                    e.stopPropagation()
                                    decide(t, "TAKEN")
                                }}
                            >
                                Участвуем
                            </Button>
                            <Button
                                variant='ghost'
                                size='sm'
                                disabled={busyId === t.id}
                                onClick={e => {
                                    e.stopPropagation()
                                    decide(t, "SKIPPED")
                                }}
                            >
                                Мимо
                            </Button>
                        </div>
                    )
                },
            },
        ],
        [busyId, decide, cancelParticipation, isAdmin],
    )

    const tabsWithCounts = TABS.map(t => ({
        ...t,
        label: counts[t.key] ? `${t.label} · ${counts[t.key]}` : t.label,
    }))

    return (
        <div className='space-y-4'>
            <TenderImportDialog
                open={importOpen}
                onClose={() => setImportOpen(false)}
                onDone={afterImport}
            />

            <TenderDuplicateDialog
                open={Boolean(duplicates)}
                tender={duplicates?.tender}
                candidates={duplicates?.candidates || []}
                busy={busyId === duplicates?.tender?.id}
                onClose={() => setDuplicates(null)}
                onLink={dealId => decide(duplicates.tender, "TAKEN", { dealId })}
                onCreateNew={() => decide(duplicates.tender, "TAKEN", { force: true })}
            />

            <Tabs items={tabsWithCounts} value={tab} onChange={setTab} />

            <FilterBar
                canReset={Boolean(q)}
                onReset={() => setQ("")}
                actions={
                    <div className='flex flex-wrap gap-2'>
                        <Button
                            type='button'
                            size='sm'
                            variant='secondary'
                            onClick={() => setImportOpen(true)}
                            title='Найти закупку по номеру во всём Тендерлэнде — для тех, что автопоиск не поймал'
                        >
                            <LuPlus className='h-4 w-4' />
                            По номеру
                        </Button>
                        <Button
                            type='button'
                            size='sm'
                            onClick={sync}
                            loading={syncing}
                            title='Забрать свежие закупки из автопоиска «CRM: воронка закупок» и сверить те, что уже в работе'
                        >
                            <LuDownload className='h-4 w-4' />
                            {syncing ? "Обновляю…" : "Обновить закупки"}
                        </Button>
                    </div>
                }
            >
                <FilterSearch
                    value={q}
                    onChange={setQ}
                    placeholder='Название, номер закупки, заказчик или ИНН'
                />
            </FilterBar>

            {error ? (
                <div className='rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
                    {error}
                </div>
            ) : null}

            {items === null ? (
                <CardListSkeleton />
            ) : items.length === 0 ? (
                <EmptyState
                    icon={LuGavel}
                    title={EMPTY_TITLES[tab] || `Нет закупок в разделе «${TENDER_DECISION_LABELS[tab] || "Все"}»`}
                    hint={EMPTY_HINTS[tab]}
                />
            ) : (
                <>
                    <div className='hidden md:block'>
                        <DataTable
                            columns={columns}
                            rows={items}
                            getRowId={t => t.id}
                            pageSize={20}
                        />
                    </div>
                    <div className='space-y-3 md:hidden'>
                        {items.map(t => {
                            const { label, tone } = deadlineTone(t.endDate)
                            return (
                                <MobileCard key={t.id}>
                                    <div className='mb-2 font-medium text-neutral-900'>
                                        {t.name}
                                    </div>
                                    <CardRow label='Приём заявок до'>
                                        <span className={tone}>{label}</span>
                                    </CardRow>
                                    <CardRow label='НМЦК'>
                                        {Number(t.beginPrice) > 0 ? formatMoney(t.beginPrice) : "—"}
                                    </CardRow>
                                    <CardRow label='Заказчик'>
                                        <span>
                                            {tenderCustomerLabel(t) || "—"}
                                            {t.openDeal ? (
                                                <span className='block text-xs text-amber-600'>
                                                    уже есть сделка
                                                    {t.openDeal.managerName
                                                        ? ` · ${t.openDeal.managerName}`
                                                        : ""}
                                                </span>
                                            ) : null}
                                        </span>
                                    </CardRow>
                                    {t.winnerName ? (
                                        <CardRow label='Победитель'>
                                            {t.winnerIsOwn ? "наше юрлицо" : t.winnerName}
                                        </CardRow>
                                    ) : null}
                                    {t.skipReason ? (
                                        <CardRow label='Причина отказа'>{t.skipReason}</CardRow>
                                    ) : null}
                                    <CardRow label='Подробности'>
                                        <span className='flex flex-wrap items-center gap-x-3 gap-y-1'>
                                            {t.sourceLink ? (
                                                <OutLink href={t.sourceLink}>источник</OutLink>
                                            ) : null}
                                            {tenderlandCardUrl(t.tenderlandId) ? (
                                                <OutLink href={tenderlandCardUrl(t.tenderlandId)}>
                                                    Тендерлэнд
                                                </OutLink>
                                            ) : null}
                                        </span>
                                    </CardRow>
                                    {t.decision === "NEW" ? (
                                        <div className='flex gap-2 pt-2'>
                                            <Button
                                                size='sm'
                                                disabled={busyId === t.id}
                                                onClick={() => decide(t, "TAKEN")}
                                            >
                                                Участвуем
                                            </Button>
                                            <Button
                                                variant='ghost'
                                                size='sm'
                                                disabled={busyId === t.id}
                                                onClick={() => decide(t, "SKIPPED")}
                                            >
                                                Мимо
                                            </Button>
                                        </div>
                                    ) : null}
                                    {t.decision === "TAKEN" ? (
                                        <div className='flex gap-2 pt-2'>
                                            {t.dealId ? (
                                                <Button
                                                    variant='secondary'
                                                    size='sm'
                                                    className='flex-1'
                                                    href={`/crm/deals/${t.dealId}`}
                                                >
                                                    Сделка
                                                    <LuArrowUpRight className='h-4 w-4' />
                                                </Button>
                                            ) : null}
                                            {isAdmin ? (
                                                <Button
                                                    variant='ghost'
                                                    size='sm'
                                                    disabled={busyId === t.id}
                                                    onClick={() => cancelParticipation(t)}
                                                >
                                                    Мимо
                                                </Button>
                                            ) : null}
                                        </div>
                                    ) : null}
                                </MobileCard>
                            )
                        })}
                    </div>
                </>
            )}
        </div>
    )
}
