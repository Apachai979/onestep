"use client"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import { LuDownload, LuExternalLink, LuGavel } from "react-icons/lu"
import { formatMoney } from "@/lib/crm/format"
import { crmYmd, daysBetweenYmd, formatCrmDate } from "@/lib/crm/datetime"
import { TENDER_DECISION_LABELS } from "@/lib/crm/tender-map"
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
                toast.error(data?.error || "Не удалось загрузить закупки", {
                    title: "Ошибка Tenderland",
                })
                return
            }
            const parts = [`Новых: ${data.created}`]
            if (data.updated) parts.push(`обновлено: ${data.updated}`)
            // Сколько осталось, Тендерлэнд не сообщает — только то, что мы упёрлись
            // в потолок выгрузки. Поэтому зовём нажать ещё раз, а не считаем остаток.
            if (data.truncated) parts.push("забрали максимум за раз — нажмите ещё раз")
            toast.success(parts.join(" · "), { title: "Закупки загружены" })
            setRefreshTick(x => x + 1)
        } catch (err) {
            toast.error(err.message || "Сбой сети")
        } finally {
            setSyncing(false)
        }
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
                toast.success("Сделка создана — открываю карточку")
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
                            {t.typeName ? <span>{t.typeName}</span> : null}
                            {t.region ? <span>{t.region}</span> : null}
                            {t.sourceLink ? (
                                <a
                                    href={t.sourceLink}
                                    target='_blank'
                                    rel='noreferrer'
                                    onClick={e => e.stopPropagation()}
                                    className='inline-flex items-center gap-1 text-brand_main hover:underline'
                                >
                                    источник <LuExternalLink className='h-3 w-3' />
                                </a>
                            ) : null}
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
                        <div className='line-clamp-2'>{t.customerName || "—"}</div>
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
                                variant='secondary'
                                size='sm'
                                onClick={e => {
                                    e.stopPropagation()
                                    router.push(`/crm/deals/${t.dealId}`)
                                }}
                            >
                                Сделка
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
            <Tabs items={tabsWithCounts} value={tab} onChange={setTab} />

            <FilterBar
                canReset={Boolean(q)}
                onReset={() => setQ("")}
                actions={
                    <Button
                        type='button'
                        size='sm'
                        onClick={sync}
                        loading={syncing}
                        title='Забрать свежие закупки из автопоиска «CRM: воронка закупок»'
                    >
                        <LuDownload className='h-4 w-4' />
                        {syncing ? "Загружаю…" : "Загрузить закупки"}
                    </Button>
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
                            ? "Нажмите «Загрузить закупки» — CRM заберёт свежие из автопоиска «CRM: воронка закупок»."
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
                                    <CardRow label='Заказчик'>{t.customerName || "—"}</CardRow>
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
                                </MobileCard>
                            )
                        })}
                    </div>
                </>
            )}
        </div>
    )
}
