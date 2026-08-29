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

const TABS = [
    { key: "NEW", label: "Не разобраны" },
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

export default function TendersList() {
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

    useEffect(() => {
        const t = setTimeout(() => setQApplied(q.trim()), 300)
        return () => clearTimeout(t)
    }, [q])

    useEffect(() => {
        const controller = new AbortController()
        const params = new URLSearchParams({ decision: tab })
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

        setTab(tender.decision || "NEW")
        const number = tender.regNumber || tender.tenderlandId || ""
        setQ(number)
        setQApplied(number)
        setRefreshTick(x => x + 1)
    }

    const decide = useCallback(async function decide(tender, decision) {
        if (decision === "SKIPPED") {
            const ok = await confirm({
                title: "Закупка не наша?",
                description: `«${tender.name.slice(0, 120)}» уйдёт в отказы. Вернуть её в разбор можно на вкладке «Мимо».`,
                confirmText: "Мимо",
            })
            if (!ok) return
        }

        setBusyId(tender.id)
        try {
            const res = await fetch(`/api/crm/tenders/${tender.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ decision }),
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) {
                toast.error(data?.error || "Не удалось сохранить решение")
                return
            }
            if (decision === "TAKEN" && data.dealId) {
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
            setRefreshTick(x => x + 1)
        } catch (err) {
            toast.error(err.message || "Сбой сети")
        } finally {
            setBusyId(null)
        }
    }, [confirm, router, toast])

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
                        {t.winnerName || t.refreshedAt ? (
                            <div className='flex flex-wrap items-center gap-2 pt-0.5 text-xs'>
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
                        return t.dealId ? (
                            <Button
                                variant='ghost'
                                size='sm'
                                title='Открыть сделку'
                                onClick={e => {
                                    e.stopPropagation()
                                    router.push(`/crm/deals/${t.dealId}`)
                                }}
                            >
                                Сделка
                                <LuArrowUpRight className='h-4 w-4' />
                            </Button>
                        ) : (
                            <Badge tone='neutral'>Участвуем</Badge>
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
        [busyId, decide, router],
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
                    title={
                        tab === "NEW"
                            ? "Новых закупок нет"
                            : `Нет закупок в разделе «${TENDER_DECISION_LABELS[tab] || "Все"}»`
                    }
                    hint={
                        tab === "NEW"
                            ? "Нажмите «Обновить закупки» — CRM заберёт свежие из автопоиска «CRM: воронка закупок»."
                            : undefined
                    }
                />
            ) : (
                <>
                    <div className='hidden md:block'>
                        <DataTable
                            columns={columns}
                            rows={items}
                            getRowId={t => t.id}
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
                                    <CardRow label='Заказчик'>{tenderCustomerLabel(t) || "—"}</CardRow>
                                    {t.winnerName ? (
                                        <CardRow label='Победитель'>
                                            {t.winnerIsOwn ? "наше юрлицо" : t.winnerName}
                                        </CardRow>
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
                                    {t.decision === "TAKEN" && t.dealId ? (
                                        <div className='pt-2'>
                                            <Button
                                                variant='secondary'
                                                size='sm'
                                                className='w-full'
                                                onClick={() =>
                                                    router.push(`/crm/deals/${t.dealId}`)
                                                }
                                            >
                                                Сделка
                                                <LuArrowUpRight className='h-4 w-4' />
                                            </Button>
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
