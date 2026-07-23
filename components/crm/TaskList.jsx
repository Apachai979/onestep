"use client"
import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { LuListTodo } from "react-icons/lu"
import {
    TASK_STATUSES,
    TASK_STATUS_COLORS,
    TASK_STATUS_LABELS,
    TASK_TYPES,
    allDayDateLabel,
} from "@/lib/crm/task"
import { onTasksChanged } from "@/lib/crm/tasks-events"
import SearchableSelect from "./SearchableSelect"
import { TaskTypeBadge } from "./TaskTypeIcon"
import TaskCloseModal from "./TaskCloseModal"
import {
    Badge,
    Button,
    CardListSkeleton,
    CardRow,
    DataTable,
    EmptyState,
    Field,
    MobileCard,
    Select,
} from "@/components/crm/ui"

function safeJson(text) {
    try {
        return JSON.parse(text)
    } catch {
        return null
    }
}

function fullName(u) {
    if (!u) return "—"
    return `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email
}

function fmtRange(t) {
    if (t.allDay) {
        const s = allDayDateLabel(t.startAt)
        const e = allDayDateLabel(t.endAt)
        return s === e ? s : `${s} — ${e}`
    }
    const start = new Date(t.startAt)
    const end = new Date(t.endAt)
    return `${start.toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" })} — ${end.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`
}

function relationLink(t) {
    if (t.deal)
        return {
            href: `/crm/deals/${t.deal.id}`,
            label: t.deal.title || `Сделка с ${t.deal.counterparty?.name || "клиентом"}`,
        }
    if (t.project)
        return { href: `/crm/projects/${t.project.id}`, label: t.project.internalName }
    if (t.auction)
        return {
            href: `/crm/auctions/${t.auction.id}`,
            label: t.auction.purchaseNumber
                ? `Аукцион: закупка № ${t.auction.purchaseNumber}`
                : "Аукцион",
        }
    if (t.distributor)
        return { href: `/crm/counterparties/${t.distributor.id}`, label: t.distributor.name }
    if (t.endCustomer)
        return { href: `/crm/counterparties/${t.endCustomer.id}`, label: t.endCustomer.name }
    return null
}

export default function TaskList({ currentUserId, currentUserRole }) {
    const [items, setItems] = useState(null)
    const [error, setError] = useState("")
    const [closing, setClosing] = useState(null)
    const [filters, setFilters] = useState({
        status: "OPEN",
        type: "",
        assigneeId: "",
    })
    const [todayOnly, setTodayOnly] = useState(false)
    const [users, setUsers] = useState([])

    useEffect(() => {
        fetch("/api/crm/users")
            .then(r => (r.ok ? r.json() : { items: [] }))
            .then(d => setUsers(d.items || []))
            .catch(() => setUsers([]))
    }, [])

    const assigneeOptions = useMemo(
        () =>
            users.map(u => {
                const name = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email
                return {
                    id: u.id,
                    label:
                        u.id === currentUserId ? `${name} (вы)` : name,
                    search: `${u.firstName ?? ""} ${u.lastName ?? ""} ${u.email ?? ""}`,
                }
            }),
        [users, currentUserId],
    )

    const load = useCallback(async () => {
        const params = new URLSearchParams()
        if (filters.status) params.set("status", filters.status)
        if (filters.type) params.set("type", filters.type)
        if (filters.assigneeId) params.set("assigneeId", filters.assigneeId)
        if (todayOnly) {
            const now = new Date()
            const y = now.getFullYear()
            const m = String(now.getMonth() + 1).padStart(2, "0")
            const d = String(now.getDate()).padStart(2, "0")
            const today = `${y}-${m}-${d}`
            params.set("from", today)
            params.set("to", today)
            params.set("mine", "1")
        }
        setError("")
        const r = await fetch(`/api/crm/tasks?${params.toString()}`)
        const text = await r.text()
        const data = text ? safeJson(text) : {}
        if (!r.ok) {
            setError(data?.error || `Ошибка ${r.status}`)
            setItems([])
            return
        }
        setItems(data.items || [])
    }, [filters, todayOnly])

    useEffect(() => {
        load()
    }, [load])

    useEffect(() => {
        return onTasksChanged(() => load())
    }, [load])

    function canClose(t) {
        if (currentUserRole === "ADMIN") return true
        return t.assigneeId === currentUserId || t.createdById === currentUserId
    }

    function isOverdue(t) {
        if (t.status !== "OPEN") return false
        return new Date(t.endAt) < new Date()
    }

    const columns = useMemo(
        () => [
            {
                key: "title",
                header: "Заголовок",
                sortable: true,
                sortValue: t => t.title,
                render: t => (
                    <div>
                        <div className='font-medium text-neutral-900'>{t.title}</div>
                        {t.description && (
                            <div className='mt-0.5 whitespace-pre-wrap text-xs text-neutral-500'>
                                {t.description}
                            </div>
                        )}
                    </div>
                ),
            },
            {
                key: "type",
                header: "Тип",
                render: t => <TaskTypeBadge type={t.type} />,
                hideable: true,
            },
            {
                key: "endAt",
                header: "Срок",
                sortable: true,
                sortValue: t => new Date(t.endAt).getTime(),
                render: t => (
                    <span className={isOverdue(t) ? "text-red-600" : "text-neutral-700"}>
                        {fmtRange(t)}
                    </span>
                ),
            },
            {
                key: "assignee",
                header: "Ответственный",
                sortable: true,
                sortValue: t => fullName(t.assignee),
                render: t => fullName(t.assignee),
                hideable: true,
            },
            {
                key: "relation",
                header: "Связь",
                render: t => {
                    const rel = relationLink(t)
                    return rel ? (
                        <Link
                            href={rel.href}
                            onClick={e => e.stopPropagation()}
                            className='text-neutral-700 underline decoration-neutral-300 underline-offset-2 hover:text-brand_main'
                        >
                            {rel.label}
                        </Link>
                    ) : (
                        "—"
                    )
                },
                hideable: true,
            },
            {
                key: "status",
                header: "Статус",
                sortable: true,
                sortValue: t => TASK_STATUS_LABELS[t.status] || t.status,
                render: t => (
                    <Badge className={TASK_STATUS_COLORS[t.status]}>
                        {TASK_STATUS_LABELS[t.status]}
                    </Badge>
                ),
            },
        ],
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [],
    )

    return (
        <div className='space-y-4'>
            <div className='flex flex-wrap items-end gap-3 rounded-2xl border border-line bg-white p-4 shadow-sm'>
                <Field label='Статус' className='flex-1 min-w-[180px]'>
                    <Select
                        value={filters.status}
                        onChange={e =>
                            setFilters(prev => ({ ...prev, status: e.target.value }))
                        }
                    >
                        <option value=''>Все</option>
                        {TASK_STATUSES.map(s => (
                            <option key={s} value={s}>
                                {TASK_STATUS_LABELS[s]}
                            </option>
                        ))}
                    </Select>
                </Field>
                <Field label='Тип' className='flex-1 min-w-[180px]'>
                    <Select
                        value={filters.type}
                        onChange={e =>
                            setFilters(prev => ({ ...prev, type: e.target.value }))
                        }
                    >
                        <option value=''>Все</option>
                        {TASK_TYPES.map(t => (
                            <option key={t.key} value={t.key}>
                                {t.label}
                            </option>
                        ))}
                    </Select>
                </Field>
                <Field label='Ответственный' className='flex-1 min-w-[220px]'>
                    <SearchableSelect
                        value={filters.assigneeId}
                        onChange={id =>
                            setFilters(prev => ({ ...prev, assigneeId: id }))
                        }
                        options={assigneeOptions}
                        placeholder='Все'
                        emptyLabel='Сотрудник не найден'
                    />
                </Field>
                {currentUserId && (
                    <Button
                        type='button'
                        variant={filters.assigneeId === currentUserId ? "primary" : "secondary"}
                        title='Показать только мои задачи'
                        onClick={() =>
                            setFilters(prev => ({
                                ...prev,
                                assigneeId:
                                    prev.assigneeId === currentUserId ? "" : currentUserId,
                            }))
                        }
                    >
                        Только мои
                    </Button>
                )}
                {currentUserId && (
                    <Button
                        type='button'
                        variant={todayOnly ? "primary" : "secondary"}
                        title='Мои задачи на сегодня'
                        onClick={() => setTodayOnly(prev => !prev)}
                    >
                        На сегодня
                    </Button>
                )}
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
                        icon={LuListTodo}
                        title='Задач не найдено'
                        hint='Попробуйте сбросить фильтры — или создайте задачу из карточки сделки/проекта.'
                    />
                )}
                {items?.map(t => {
                    const rel = relationLink(t)
                    const overdue = isOverdue(t)
                    return (
                        <MobileCard key={t.id} onClick={() => setClosing(t)}>
                            <div className='flex items-start justify-between gap-2'>
                                <span className='font-medium text-neutral-900'>{t.title}</span>
                                <Badge className={TASK_STATUS_COLORS[t.status]}>
                                    {TASK_STATUS_LABELS[t.status]}
                                </Badge>
                            </div>
                            {t.description && (
                                <p className='mt-1 line-clamp-2 text-xs text-neutral-500'>
                                    {t.description}
                                </p>
                            )}
                            <div className='mt-2 flex flex-wrap items-center gap-2 text-xs'>
                                <TaskTypeBadge type={t.type} />
                                <span className={overdue ? "text-red-600" : "text-neutral-500"}>
                                    {fmtRange(t)}
                                </span>
                            </div>
                            <div className='mt-2 space-y-1'>
                                <CardRow label='Ответственный'>{fullName(t.assignee)}</CardRow>
                                {rel && (
                                    <CardRow label='Связь'>
                                        <Link
                                            href={rel.href}
                                            onClick={e => e.stopPropagation()}
                                            className='text-neutral-700 underline hover:text-brand_main'
                                        >
                                            {rel.label}
                                        </Link>
                                    </CardRow>
                                )}
                            </div>
                        </MobileCard>
                    )
                })}
            </div>

            <div className='hidden md:block'>
                <DataTable
                    columns={columns}
                    rows={items || []}
                    loading={items === null}
                    getRowId={t => t.id}
                    onRowClick={t => setClosing(t)}
                    initialSort={{ key: "endAt", dir: "asc" }}
                    empty={
                        <EmptyState
                            icon={LuListTodo}
                            title='Задач не найдено'
                            hint='Попробуйте сбросить фильтры — или создайте задачу из карточки сделки/проекта.'
                        />
                    }
                />
            </div>

            {closing && (
                <TaskCloseModal
                    task={closing}
                    canClose={closing.status === "OPEN" && canClose(closing)}
                    canReopen={closing.status !== "OPEN" && canClose(closing)}
                    onClose={() => setClosing(null)}
                    onClosed={() => {
                        setClosing(null)
                        load()
                    }}
                />
            )}
        </div>
    )
}
