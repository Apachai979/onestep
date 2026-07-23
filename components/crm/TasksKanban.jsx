"use client"
import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { LuSearch } from "react-icons/lu"
import {
    TASK_STATUSES,
    TASK_STATUS_COLORS,
    TASK_STATUS_LABELS,
    allDayDateLabel,
} from "@/lib/crm/task"
import { notifyTasksChanged, onTasksChanged } from "@/lib/crm/tasks-events"
import { TaskTypeBadge } from "./TaskTypeIcon"
import TaskCloseModal from "./TaskCloseModal"
import SearchableSelect from "./SearchableSelect"
import { Button, Field, Input, Modal, useToast } from "@/components/crm/ui"

const COLUMN_ACCENT = {
    OPEN: "bg-blue-300/70",
    DONE: "bg-emerald-300/70",
    FAILED: "bg-red-300/70",
}

const COLUMN_HINTS = {
    OPEN: "Задачи в работе. Перетащите вправо, чтобы закрыть.",
    DONE: "Закрытые с результатом. Можно вернуть в «Открыта».",
    FAILED: "Закрытые без результата. Можно вернуть в «Открыта».",
}

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

export default function TasksKanban({ currentUserId, currentUserRole }) {
    const toast = useToast()
    const [items, setItems] = useState(null)
    const [error, setError] = useState("")
    const [q, setQ] = useState("")
    const [assigneeId, setAssigneeId] = useState("")
    const [users, setUsers] = useState([])
    const [draggingId, setDraggingId] = useState(null)
    const [dragOver, setDragOver] = useState(null)
    const [failingTask, setFailingTask] = useState(null)
    const [viewing, setViewing] = useState(null)

    const load = useCallback(async () => {
        setError("")
        try {
            const params = new URLSearchParams()
            if (assigneeId) params.set("assigneeId", assigneeId)
            const r = await fetch(`/api/crm/tasks?${params.toString()}`)
            const text = await r.text()
            const data = text ? safeJson(text) : {}
            if (!r.ok) throw new Error(data?.error || `Ошибка ${r.status}`)
            setItems(data.items || [])
        } catch (err) {
            setError(err.message)
            setItems([])
        }
    }, [assigneeId])

    useEffect(() => {
        load()
    }, [load])

    useEffect(() => {
        return onTasksChanged(() => load())
    }, [load])

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
                    label: u.id === currentUserId ? `${name} (вы)` : name,
                    search: `${u.firstName ?? ""} ${u.lastName ?? ""} ${u.email ?? ""}`,
                }
            }),
        [users, currentUserId],
    )

    const filtered = useMemo(() => {
        if (!items) return null
        if (!q.trim()) return items
        const ql = q.toLowerCase()
        return items.filter(
            t =>
                (t.title || "").toLowerCase().includes(ql) ||
                (t.description || "").toLowerCase().includes(ql),
        )
    }, [items, q])

    const byStatus = useMemo(() => {
        const map = Object.fromEntries(TASK_STATUSES.map(s => [s, []]))
        for (const t of filtered || []) {
            if (map[t.status]) map[t.status].push(t)
        }
        map.OPEN.sort((a, b) => new Date(a.endAt) - new Date(b.endAt))
        for (const s of ["DONE", "FAILED"]) {
            map[s].sort(
                (a, b) => new Date(b.closedAt || b.endAt) - new Date(a.closedAt || a.endAt),
            )
        }
        return map
    }, [filtered])

    function canManage(t) {
        if (currentUserRole === "ADMIN") return true
        return t.assigneeId === currentUserId || t.createdById === currentUserId
    }

    function isOverdue(t) {
        if (t.status !== "OPEN") return false
        return new Date(t.endAt) < new Date()
    }

    async function request(url, options, fallbackError) {
        const r = await fetch(url, options)
        if (!r.ok) {
            const text = await r.text()
            const d = text ? safeJson(text) : {}
            throw new Error(d?.error || fallbackError)
        }
    }

    async function moveTask(task, newStatus, { result = "" } = {}) {
        const prev = items
        setItems(curr =>
            curr.map(t =>
                t.id === task.id
                    ? {
                          ...t,
                          status: newStatus,
                          result: newStatus === "OPEN" ? null : result || null,
                          closedAt: newStatus === "OPEN" ? null : new Date().toISOString(),
                      }
                    : t,
            ),
        )
        try {
            if (newStatus === "OPEN") {
                await request(
                    `/api/crm/tasks/${task.id}/close`,
                    { method: "DELETE" },
                    "Не удалось вернуть задачу в работу",
                )
            } else {
                await request(
                    `/api/crm/tasks/${task.id}/close`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ status: newStatus, result }),
                    },
                    "Не удалось закрыть задачу",
                )
            }
            notifyTasksChanged()
        } catch (err) {
            setItems(prev)
            toast.error(err.message)
        }
    }

    function onDragStart(id) {
        return e => {
            setDraggingId(id)
            e.dataTransfer.effectAllowed = "move"
            e.dataTransfer.setData("text/plain", id)
        }
    }

    function onDragEnd() {
        setDraggingId(null)
        setDragOver(null)
    }

    function onDragOver(status) {
        return e => {
            e.preventDefault()
            e.dataTransfer.dropEffect = "move"
            if (dragOver !== status) setDragOver(status)
        }
    }

    function onDrop(status) {
        return e => {
            e.preventDefault()
            const id = e.dataTransfer.getData("text/plain") || draggingId
            setDragOver(null)
            setDraggingId(null)
            if (!id) return
            const task = items?.find(t => t.id === id)
            if (!task || task.status === status) return
            if (!canManage(task)) {
                toast.error(
                    "Менять статус может ответственный, создатель или администратор",
                )
                return
            }
            // Между закрытыми статусами напрямую не переносим — сначала в «Открыта».
            if (task.status !== "OPEN" && status !== "OPEN") {
                toast.error("Сначала верните задачу в «Открыта»")
                return
            }
            // Закрытие как «Не выполнена» — только с комментарием.
            if (status === "FAILED") {
                setFailingTask(task)
                return
            }
            moveTask(task, status)
        }
    }

    return (
        <div className='space-y-4'>
            <div className='flex flex-wrap items-end gap-3 rounded-2xl border border-line bg-white p-4 shadow-sm'>
                <Field label='Поиск' className='flex-1 min-w-[220px]'>
                    <Input
                        icon={LuSearch}
                        value={q}
                        onChange={e => setQ(e.target.value)}
                        placeholder='Заголовок или описание'
                    />
                </Field>
                <Field label='Ответственный' className='flex-1 min-w-[220px]'>
                    <SearchableSelect
                        value={assigneeId}
                        onChange={setAssigneeId}
                        options={assigneeOptions}
                        placeholder='Все'
                        emptyLabel='Сотрудник не найден'
                    />
                </Field>
                {currentUserId && (
                    <Button
                        type='button'
                        variant={assigneeId === currentUserId ? "primary" : "secondary"}
                        title='Показать только мои задачи'
                        onClick={() =>
                            setAssigneeId(prev =>
                                prev === currentUserId ? "" : currentUserId,
                            )
                        }
                    >
                        Только мои
                    </Button>
                )}
            </div>

            {error && (
                <p className='rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700'>
                    {error}
                </p>
            )}

            <div className='flex gap-3 overflow-x-auto pb-3'>
                {TASK_STATUSES.map(status => {
                    const list = byStatus[status] || []
                    return (
                        <div
                            key={status}
                            onDragOver={onDragOver(status)}
                            onDragLeave={() => setDragOver(null)}
                            onDrop={onDrop(status)}
                            className={`flex w-[290px] shrink-0 flex-col overflow-hidden rounded-2xl border bg-surface_muted transition-shadow ${
                                dragOver === status
                                    ? "border-brand_main ring-2 ring-brand_main/25"
                                    : "border-line"
                            }`}
                        >
                            <div className={`h-0.5 w-full ${COLUMN_ACCENT[status]}`} />
                            <div className='flex flex-1 flex-col p-3'>
                                <div className='mb-1 flex items-center gap-2'>
                                    <span
                                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${TASK_STATUS_COLORS[status]}`}
                                    >
                                        {TASK_STATUS_LABELS[status]}
                                    </span>
                                    <span className='text-xs text-neutral-400'>
                                        {list.length}
                                    </span>
                                </div>
                                <p className='mb-3 text-[10px] leading-tight text-neutral-400'>
                                    {COLUMN_HINTS[status]}
                                </p>
                                <div className='flex flex-col gap-2'>
                                    {items === null && (
                                        <p className='text-xs text-neutral-400'>Загрузка...</p>
                                    )}
                                    {list.map(t => (
                                        <TaskCard
                                            key={t.id}
                                            task={t}
                                            overdue={isOverdue(t)}
                                            dragging={draggingId === t.id}
                                            draggable={canManage(t)}
                                            onDragStart={onDragStart(t.id)}
                                            onDragEnd={onDragEnd}
                                            onClick={() => setViewing(t)}
                                        />
                                    ))}
                                    {items !== null && list.length === 0 && (
                                        <p className='text-xs italic text-neutral-400'>Пусто</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            {failingTask && (
                <TaskFailDialog
                    task={failingTask}
                    onCancel={() => setFailingTask(null)}
                    onConfirm={result => {
                        moveTask(failingTask, "FAILED", { result })
                        setFailingTask(null)
                    }}
                />
            )}

            {viewing && (
                <TaskCloseModal
                    task={viewing}
                    canClose={viewing.status === "OPEN" && canManage(viewing)}
                    canReopen={viewing.status !== "OPEN" && canManage(viewing)}
                    onClose={() => setViewing(null)}
                    onClosed={() => {
                        setViewing(null)
                        load()
                    }}
                />
            )}
        </div>
    )
}

function TaskCard({ task, overdue, dragging, draggable, onDragStart, onDragEnd, onClick }) {
    const rel = relationLink(task)
    return (
        <div
            role='button'
            tabIndex={0}
            draggable={draggable}
            onDragStart={draggable ? onDragStart : undefined}
            onDragEnd={draggable ? onDragEnd : undefined}
            onClick={onClick}
            onKeyDown={e => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    onClick()
                }
            }}
            className={`block rounded-xl border bg-white p-3 text-sm shadow-sm transition-all duration-200 hover:border-line_strong hover:shadow-md ${
                draggable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
            } ${dragging ? "opacity-50" : "border-line"}`}
        >
            <p className='font-medium leading-snug text-neutral-900'>{task.title}</p>
            {task.description && (
                <p className='mt-1 line-clamp-2 text-xs text-neutral-500'>
                    {task.description}
                </p>
            )}
            <div className='mt-2 flex flex-wrap items-center gap-2 text-xs'>
                <TaskTypeBadge type={task.type} />
                <span className={overdue ? "text-red-600" : "text-neutral-500"}>
                    {fmtRange(task)}
                </span>
            </div>
            <div className='mt-2 flex items-center justify-between gap-2 text-xs'>
                <span className='truncate text-neutral-500'>{fullName(task.assignee)}</span>
                {rel && (
                    <Link
                        href={rel.href}
                        onClick={e => e.stopPropagation()}
                        className='max-w-[45%] truncate text-neutral-700 underline decoration-neutral-300 underline-offset-2 hover:text-brand_main'
                    >
                        {rel.label}
                    </Link>
                )}
            </div>
        </div>
    )
}

function TaskFailDialog({ task, onCancel, onConfirm }) {
    const [result, setResult] = useState("")
    return (
        <Modal open onClose={onCancel} title='Задача не выполнена'>
            <form
                onSubmit={e => {
                    e.preventDefault()
                    if (!result.trim()) return
                    onConfirm(result.trim())
                }}
                className='space-y-4'
            >
                <p className='text-sm text-neutral-600'>
                    Чтобы закрыть задачу «{task.title}» как «Не выполнена», укажите причину.
                </p>
                <textarea
                    rows={4}
                    value={result}
                    onChange={e => setResult(e.target.value)}
                    required
                    autoFocus
                    placeholder='Почему не получилось'
                    className='w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm transition-all duration-200 placeholder:text-neutral-400 focus:border-brand_main focus:outline-none focus:ring-2 focus:ring-brand_main/20'
                />
                <div className='flex justify-end gap-2'>
                    <Button type='button' variant='secondary' onClick={onCancel}>
                        Отмена
                    </Button>
                    <Button type='submit'>Закрыть задачу</Button>
                </div>
            </form>
        </Modal>
    )
}
