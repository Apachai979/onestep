"use client"
import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { LuSearch } from "react-icons/lu"
import {
    TASK_BUCKETS,
    TASK_BUCKET_LABELS,
    TASK_DUE_COLORS,
    taskBucket,
    taskBucketTargetYmd,
    taskDueRelativeLabel,
    taskDueState,
    taskLaterMinYmd,
    taskRangeLabel,
    taskRescheduleInput,
} from "@/lib/crm/task"
import { crmToday, formatCrmDate } from "@/lib/crm/datetime"
import { notifyTasksChanged, onTasksChanged } from "@/lib/crm/tasks-events"
import { dealDisplayTitle } from "@/lib/crm/deal"
import { TaskTypeBadge } from "./TaskTypeIcon"
import TaskCloseModal from "./TaskCloseModal"
import SearchableSelect from "./SearchableSelect"
import { Button, Field, Input, Modal, useToast } from "@/components/crm/ui"

const COLUMN_ACCENT = {
    overdue: "bg-red-400/80",
    today: "bg-amber-300/80",
    tomorrow: "bg-blue-300/70",
    later: "bg-neutral-300/70",
}

const COLUMN_BADGE = {
    overdue: "bg-red-50 text-red-700",
    today: "bg-amber-50 text-amber-700",
    tomorrow: "bg-blue-50 text-blue-700",
    later: "bg-neutral-100 text-neutral-600",
}

const COLUMN_HINTS = {
    overdue: "Срок прошёл. Перетащите вправо, чтобы перенести.",
    today: "Сделать сегодня. Бросок сюда переносит срок на сегодня.",
    tomorrow: "Сделать завтра. Бросок сюда переносит срок на завтра.",
    later: "Всё остальное впереди. При броске спросим дату.",
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

export default function TasksKanban({ currentUserId, currentUserRole }) {
    const toast = useToast()
    const [items, setItems] = useState(null)
    const [error, setError] = useState("")
    const [q, setQ] = useState("")
    const [assigneeId, setAssigneeId] = useState("")
    const [users, setUsers] = useState([])
    const [draggingId, setDraggingId] = useState(null)
    const [dragOver, setDragOver] = useState(null)
    const [pendingId, setPendingId] = useState(null)
    const [laterTask, setLaterTask] = useState(null)
    const [viewing, setViewing] = useState(null)
    const [today, setToday] = useState(() => crmToday())

    const load = useCallback(async () => {
        setError("")
        try {
            const params = new URLSearchParams({ status: "OPEN" })
            if (assigneeId) params.set("assigneeId", assigneeId)
            const r = await fetch(`/api/crm/tasks?${params.toString()}`)
            const text = await r.text()
            const data = text ? safeJson(text) : {}
            if (!r.ok) throw new Error(data?.error || `Ошибка ${r.status}`)
            setToday(crmToday())
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

    // Вкладку держат открытой сутками — иначе после полуночи «сегодня» уезжает.
    useEffect(() => {
        const id = setInterval(() => {
            const now = crmToday()
            setToday(prev => (prev === now ? prev : now))
        }, 60_000)
        return () => clearInterval(id)
    }, [])

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

    const byBucket = useMemo(() => {
        const map = Object.fromEntries(TASK_BUCKETS.map(b => [b, []]))
        for (const t of filtered || []) {
            const bucket = taskBucket(t, today)
            if (map[bucket]) map[bucket].push(t)
        }
        // Просроченные — самые давние сверху, остальные — по ближайшему сроку.
        map.overdue.sort((a, b) => new Date(a.endAt) - new Date(b.endAt))
        for (const b of ["today", "tomorrow", "later"]) {
            map[b].sort((a, b2) => new Date(a.endAt) - new Date(b2.endAt))
        }
        return map
    }, [filtered, today])

    function canManage(t) {
        if (currentUserRole === "ADMIN") return true
        return t.assigneeId === currentUserId || t.createdById === currentUserId
    }

    async function reschedule(task, targetYmd) {
        const payload = taskRescheduleInput(task, targetYmd)
        if (!payload) return
        setPendingId(task.id)
        try {
            const r = await fetch(`/api/crm/tasks/${task.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            })
            const text = await r.text()
            const data = text ? safeJson(text) : {}
            if (!r.ok) throw new Error(data?.error || "Не удалось перенести срок")
            setItems(curr =>
                curr.map(t => (t.id === task.id ? data.item ?? t : t)),
            )
            toast.success(`Срок перенесён на ${formatCrmDate(data.item?.endAt) || targetYmd}`)
            notifyTasksChanged()
        } catch (err) {
            toast.error(err.message)
            load()
        } finally {
            setPendingId(null)
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

    function onDragOver(bucket) {
        return e => {
            // «Просроченные» — не цель переноса: назад в прошлое срок не двигаем.
            if (bucket === "overdue") return
            e.preventDefault()
            e.dataTransfer.dropEffect = "move"
            if (dragOver !== bucket) setDragOver(bucket)
        }
    }

    function onDrop(bucket) {
        return e => {
            e.preventDefault()
            const id = e.dataTransfer.getData("text/plain") || draggingId
            setDragOver(null)
            setDraggingId(null)
            if (!id || bucket === "overdue") return
            const task = items?.find(t => t.id === id)
            if (!task || taskBucket(task, today) === bucket) return
            if (!canManage(task)) {
                toast.error("Менять срок может ответственный, создатель или администратор")
                return
            }
            if (bucket === "later") {
                setLaterTask(task)
                return
            }
            reschedule(task, taskBucketTargetYmd(bucket, today))
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
                {TASK_BUCKETS.map(bucket => {
                    const list = byBucket[bucket] || []
                    return (
                        <div
                            key={bucket}
                            onDragOver={onDragOver(bucket)}
                            onDragLeave={() => setDragOver(null)}
                            onDrop={onDrop(bucket)}
                            className={`flex w-[290px] shrink-0 flex-col overflow-hidden rounded-2xl border bg-surface_muted transition-shadow ${
                                dragOver === bucket
                                    ? "border-brand_main ring-2 ring-brand_main/25"
                                    : "border-line"
                            }`}
                        >
                            <div className={`h-0.5 w-full ${COLUMN_ACCENT[bucket]}`} />
                            <div className='flex flex-1 flex-col p-3'>
                                <div className='mb-1 flex items-center gap-2'>
                                    <span
                                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${COLUMN_BADGE[bucket]}`}
                                    >
                                        {TASK_BUCKET_LABELS[bucket]}
                                    </span>
                                    <span className='text-xs text-neutral-400'>
                                        {list.length}
                                    </span>
                                </div>
                                <p className='mb-3 text-[10px] leading-tight text-neutral-400'>
                                    {COLUMN_HINTS[bucket]}
                                </p>
                                <div className='flex flex-col gap-2'>
                                    {items === null && (
                                        <p className='text-xs text-neutral-400'>Загрузка...</p>
                                    )}
                                    {list.map(t => (
                                        <TaskCard
                                            key={t.id}
                                            task={t}
                                            dragging={draggingId === t.id}
                                            pending={pendingId === t.id}
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

            {laterTask && (
                <RescheduleDialog
                    task={laterTask}
                    today={today}
                    onCancel={() => setLaterTask(null)}
                    onConfirm={ymd => {
                        reschedule(laterTask, ymd)
                        setLaterTask(null)
                    }}
                />
            )}

            {viewing && (
                <TaskCloseModal
                    task={viewing}
                    canClose={canManage(viewing)}
                    canReopen={false}
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

function TaskCard({ task, dragging, pending, draggable, onDragStart, onDragEnd, onClick }) {
    const rel = relationLink(task)
    const dueHint = taskDueRelativeLabel(task)
    return (
        <div
            role='button'
            tabIndex={0}
            draggable={draggable && !pending}
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
            } ${dragging || pending ? "opacity-50" : "border-line"}`}
        >
            <p className='font-medium leading-snug text-neutral-900'>{task.title}</p>
            {task.description && (
                <p className='mt-1 line-clamp-2 text-xs text-neutral-500'>
                    {task.description}
                </p>
            )}
            <div className='mt-2 flex flex-wrap items-center gap-2 text-xs'>
                <TaskTypeBadge type={task.type} />
                <span className={TASK_DUE_COLORS[taskDueState(task)]}>
                    {taskRangeLabel(task)}
                    {dueHint && <span className='ml-1 opacity-70'>· {dueHint}</span>}
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

function RescheduleDialog({ task, today, onCancel, onConfirm }) {
    const min = taskLaterMinYmd(today)
    const [ymd, setYmd] = useState(min)
    return (
        <Modal open onClose={onCancel} title='Перенести срок'>
            <form
                onSubmit={e => {
                    e.preventDefault()
                    if (!ymd || ymd < min) return
                    onConfirm(ymd)
                }}
                className='space-y-4'
            >
                <p className='text-sm text-neutral-600'>
                    На какую дату перенести задачу «{task.title}»? Задача сдвинется целиком —
                    длительность и время сохранятся.
                </p>
                <Field label='Новый срок'>
                    <Input
                        type='date'
                        value={ymd}
                        min={min}
                        onChange={e => setYmd(e.target.value)}
                        required
                        autoFocus
                    />
                </Field>
                <div className='flex justify-end gap-2'>
                    <Button type='button' variant='secondary' onClick={onCancel}>
                        Отмена
                    </Button>
                    <Button type='submit'>Перенести</Button>
                </div>
            </form>
        </Modal>
    )
}
