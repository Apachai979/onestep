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
import { CardListSkeleton, CardRow, EmptyState, MobileCard, TableSkeleton } from "@/components/crm/ui"

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

    return (
        <div className='space-y-4'>
            <div className='flex flex-wrap items-end gap-3 rounded-xl border border-brand_soft/40 bg-white/70 p-4'>
                <div className='flex-1 min-w-[180px]'>
                    <label className='mb-1 block text-xs text-night_green/65'>Статус</label>
                    <select
                        value={filters.status}
                        onChange={e =>
                            setFilters(prev => ({ ...prev, status: e.target.value }))
                        }
                        className='w-full rounded-lg border border-brand_soft/60 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand_main focus:outline-none'
                    >
                        <option value=''>Все</option>
                        {TASK_STATUSES.map(s => (
                            <option key={s} value={s}>
                                {TASK_STATUS_LABELS[s]}
                            </option>
                        ))}
                    </select>
                </div>
                <div className='flex-1 min-w-[180px]'>
                    <label className='mb-1 block text-xs text-night_green/65'>Тип</label>
                    <select
                        value={filters.type}
                        onChange={e =>
                            setFilters(prev => ({ ...prev, type: e.target.value }))
                        }
                        className='w-full rounded-lg border border-brand_soft/60 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand_main focus:outline-none'
                    >
                        <option value=''>Все</option>
                        {TASK_TYPES.map(t => (
                            <option key={t.key} value={t.key}>
                                {t.label}
                            </option>
                        ))}
                    </select>
                </div>
                <div className='flex-1 min-w-[220px]'>
                    <label className='mb-1 block text-xs text-night_green/65'>Ответственный</label>
                    <SearchableSelect
                        value={filters.assigneeId}
                        onChange={id =>
                            setFilters(prev => ({ ...prev, assigneeId: id }))
                        }
                        options={assigneeOptions}
                        placeholder='Все'
                        emptyLabel='Сотрудник не найден'
                    />
                </div>
                {currentUserId && (
                    <button
                        type='button'
                        onClick={() =>
                            setFilters(prev => ({
                                ...prev,
                                assigneeId:
                                    prev.assigneeId === currentUserId ? "" : currentUserId,
                            }))
                        }
                        className={`rounded-lg border px-3 py-2 text-sm shadow-sm transition ${
                            filters.assigneeId === currentUserId
                                ? "border-primary_green bg-brand_main text-white"
                                : "border-brand_soft/60 text-gray-700 hover:bg-brand_soft/30"
                        }`}
                        title='Показать только мои задачи'
                    >
                        Только мои
                    </button>
                )}
                {currentUserId && (
                    <button
                        type='button'
                        onClick={() => setTodayOnly(prev => !prev)}
                        className={`rounded-lg border px-3 py-2 text-sm shadow-sm transition ${
                            todayOnly
                                ? "border-primary_green bg-brand_main text-white"
                                : "border-brand_soft/60 text-gray-700 hover:bg-brand_soft/30"
                        }`}
                        title='Мои задачи на сегодня'
                    >
                        На сегодня
                    </button>
                )}
            </div>

            {error && (
                <p className='rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700'>
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
                                <span className='font-medium text-night_green'>{t.title}</span>
                                <span
                                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${TASK_STATUS_COLORS[t.status]}`}
                                >
                                    {TASK_STATUS_LABELS[t.status]}
                                </span>
                            </div>
                            {t.description && (
                                <p className='mt-1 line-clamp-2 text-xs text-gray-500'>
                                    {t.description}
                                </p>
                            )}
                            <div className='mt-2 flex flex-wrap items-center gap-2 text-xs'>
                                <TaskTypeBadge type={t.type} />
                                <span className={overdue ? "text-red-600" : "text-gray-600"}>
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
                                            className='text-night_green underline hover:text-brand_main'
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

            <div className='hidden overflow-x-auto rounded-xl border border-brand_soft/40 bg-white/70 md:block'>
                <table className='w-full text-sm'>
                    <thead className='sticky top-0 z-10 bg-brand_soft/30 text-left text-xs uppercase tracking-wider text-night_green/70 backdrop-blur'>
                        <tr>
                            <th className='px-4 py-3'>Заголовок</th>
                            <th className='px-4 py-3'>Тип</th>
                            <th className='px-4 py-3'>Срок</th>
                            <th className='px-4 py-3'>Ответственный</th>
                            <th className='px-4 py-3'>Связь</th>
                            <th className='px-4 py-3'>Статус</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items === null && <TableSkeleton rows={5} cols={6} />}
                        {items?.length === 0 && (
                            <EmptyState
                                colSpan={6}
                                icon={LuListTodo}
                                title='Задач не найдено'
                                hint='Попробуйте сбросить фильтры — или создайте задачу из карточки сделки/проекта.'
                            />
                        )}
                        {items?.map(t => {
                            const rel = relationLink(t)
                            const overdue = isOverdue(t)
                            return (
                                <tr
                                    key={t.id}
                                    onClick={() => setClosing(t)}
                                    className='cursor-pointer border-t border-brand_soft/30 hover:bg-brand_soft/15'
                                    title='Открыть задачу'
                                >
                                    <td className='px-4 py-3'>
                                        <div className='font-medium text-night_green'>
                                            {t.title}
                                        </div>
                                        {t.description && (
                                            <div className='mt-0.5 whitespace-pre-wrap text-xs text-gray-500'>
                                                {t.description}
                                            </div>
                                        )}
                                    </td>
                                    <td className='px-4 py-3'>
                                        <TaskTypeBadge type={t.type} />
                                    </td>
                                    <td className='px-4 py-3 text-gray-700'>
                                        <span className={overdue ? "text-red-600" : ""}>
                                            {fmtRange(t)}
                                        </span>
                                    </td>
                                    <td className='px-4 py-3 text-gray-700'>
                                        {fullName(t.assignee)}
                                    </td>
                                    <td className='px-4 py-3 text-gray-700'>
                                        {rel ? (
                                            <Link
                                                href={rel.href}
                                                onClick={e => e.stopPropagation()}
                                                className='text-night_green underline hover:text-brand_main'
                                            >
                                                {rel.label}
                                            </Link>
                                        ) : (
                                            "—"
                                        )}
                                    </td>
                                    <td className='px-4 py-3'>
                                        <span
                                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${TASK_STATUS_COLORS[t.status]}`}
                                        >
                                            {TASK_STATUS_LABELS[t.status]}
                                        </span>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {closing && (
                <TaskCloseModal
                    task={closing}
                    canClose={closing.status === "OPEN" && canClose(closing)}
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
