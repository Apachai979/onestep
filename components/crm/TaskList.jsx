"use client"
import Link from "next/link"
import { dealDisplayTitle } from "@/lib/crm/deal"
import { useCallback, useEffect, useMemo, useState } from "react"
import { LuListTodo } from "react-icons/lu"
import {
    TASK_DUE_COLORS,
    TASK_STATUSES,
    TASK_STATUS_COLORS,
    TASK_STATUS_LABELS,
    TASK_TYPES,
    taskDueRelativeLabel,
    taskDueState,
    taskRangeLabel,
} from "@/lib/crm/task"
import { crmToday } from "@/lib/crm/datetime"
import { onTasksChanged } from "@/lib/crm/tasks-events"
import { useUrlFilters } from "@/lib/crm/url-state"
import { TaskTypeBadge } from "./TaskTypeIcon"
import TaskCloseModal from "./TaskCloseModal"
import {
    Badge,
    CardListSkeleton,
    CardRow,
    DataTable,
    EmptyState,
    FilterBar,
    FilterPicker,
    FilterSelect,
    FilterToggle,
    MobileCard,
} from "@/components/crm/ui"

// Дефолт списка задач — открытые: сброс возвращает именно его, а не «все».
// Поля объекта задают и разбор адреса (см. useUrlFilters), поэтому «на сегодня»
// живёт здесь же, а не отдельным состоянием.
const DEFAULT_FILTERS = { status: "OPEN", type: "", assigneeId: "", today: false }

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

function DueCell({ task }) {
    const hint = taskDueRelativeLabel(task)
    return (
        <span className={TASK_DUE_COLORS[taskDueState(task)]}>
            {taskRangeLabel(task)}
            {hint && <span className='ml-1 text-xs opacity-70'>· {hint}</span>}
        </span>
    )
}

function relationLink(t) {
    if (t.deal)
        return {
            href: `/crm/deals/${t.deal.id}`,
            label: dealDisplayTitle(t.deal, t.deal.counterparty?.name),
        }
    if (t.project)
        return { href: `/crm/projects/${t.project.id}`, label: t.project.internalName }
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
    // Фильтры держим в адресе: вернувшись из карточки, менеджер должен увидеть
    // тот же отбор. Паузы не ждём — текстового поля здесь нет, только селекты.
    const { filters, setFilters, applied, reset } = useUrlFilters(DEFAULT_FILTERS, {
        delay: 0,
    })
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
        if (applied.status) params.set("status", applied.status)
        if (applied.type) params.set("type", applied.type)
        if (applied.assigneeId) params.set("assigneeId", applied.assigneeId)
        if (applied.today) {
            const today = crmToday()
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
    }, [applied])

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
                render: t => <DueCell task={t} />,
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
            <FilterBar
                canReset={
                    filters.status !== DEFAULT_FILTERS.status ||
                    Boolean(filters.type) ||
                    Boolean(filters.assigneeId) ||
                    filters.today
                }
                onReset={reset}
            >
                <FilterSelect
                    label='Статус'
                    value={filters.status}
                    onChange={status => setFilters(prev => ({ ...prev, status }))}
                    options={TASK_STATUSES.map(s => ({
                        value: s,
                        label: TASK_STATUS_LABELS[s],
                    }))}
                />
                <FilterSelect
                    label='Тип'
                    value={filters.type}
                    onChange={type => setFilters(prev => ({ ...prev, type }))}
                    options={TASK_TYPES.map(t => ({ value: t.key, label: t.label }))}
                />
                <FilterPicker
                    label='Ответственный'
                    value={filters.assigneeId}
                    onChange={id => setFilters(prev => ({ ...prev, assigneeId: id }))}
                    options={assigneeOptions}
                    searchPlaceholder='Имя или email'
                    emptyLabel='Сотрудник не найден'
                />
                {currentUserId && (
                    <FilterToggle
                        label='Только мои'
                        title='Показать только мои задачи'
                        active={filters.assigneeId === currentUserId}
                        onChange={on =>
                            setFilters(prev => ({
                                ...prev,
                                assigneeId: on ? currentUserId : "",
                            }))
                        }
                    />
                )}
                {currentUserId && (
                    <FilterToggle
                        label='На сегодня'
                        title='Мои задачи на сегодня'
                        active={filters.today}
                        onChange={on => setFilters(prev => ({ ...prev, today: on }))}
                    />
                )}
            </FilterBar>

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
                                <DueCell task={t} />
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
