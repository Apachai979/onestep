"use client"
import { useEffect, useState } from "react"
import {
    TASK_STATUS_COLORS,
    TASK_STATUS_LABELS,
    allDayDateLabel,
} from "@/lib/crm/task"
import { TaskTypeBadge } from "./TaskTypeIcon"
import TaskForm from "./TaskForm"
import TaskCloseModal from "./TaskCloseModal"

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

export default function RelatedTasksSection({
    relationKind,
    relationId,
    currentUserId,
    currentUserRole,
}) {
    const [items, setItems] = useState(null)
    const [creating, setCreating] = useState(false)
    const [closing, setClosing] = useState(null)
    const [error, setError] = useState("")

    async function load() {
        setError("")
        const params = new URLSearchParams()
        if (relationKind === "deal") params.set("dealId", relationId)
        else if (relationKind === "project") params.set("projectId", relationId)
        else if (relationKind === "distributor" || relationKind === "endCustomer")
            params.set("counterpartyId", relationId)
        const r = await fetch(`/api/crm/tasks?${params.toString()}`)
        const text = await r.text()
        const data = text ? safeJson(text) : {}
        if (!r.ok) {
            setError(data?.error || `Ошибка ${r.status}`)
            setItems([])
            return
        }
        setItems(data.items || [])
    }

    useEffect(() => {
        load()
    }, [relationKind, relationId])

    function canClose(t) {
        if (currentUserRole === "ADMIN") return true
        return t.assigneeId === currentUserId || t.createdById === currentUserId
    }

    return (
        <section className='rounded-xl border border-gray-200 bg-white p-5'>
            <div className='mb-4 flex items-center justify-between'>
                <h2 className='text-sm font-semibold uppercase tracking-wide text-gray-500'>
                    Задачи
                </h2>
                {!creating && (
                    <button
                        type='button'
                        onClick={() => setCreating(true)}
                        className='rounded-lg bg-primary_green px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-contrast_green'
                    >
                        + Задача
                    </button>
                )}
            </div>

            {error && <p className='text-sm text-red-600'>{error}</p>}

            {creating && (
                <div className='mb-4 rounded-lg border border-dashed border-primary_green/40 p-4'>
                    <TaskForm
                        compact
                        fixedRelation={{ kind: relationKind, id: relationId }}
                        currentUserId={currentUserId}
                        onCancel={() => setCreating(false)}
                        onSaved={() => {
                            setCreating(false)
                            load()
                        }}
                    />
                </div>
            )}

            {items === null && <p className='text-sm text-gray-400'>Загрузка...</p>}
            {items?.length === 0 && (
                <p className='text-sm text-gray-400'>Задач по этой записи нет.</p>
            )}

            <ul className='space-y-2'>
                {items?.map(t => (
                    <li
                        key={t.id}
                        className='flex flex-col gap-2 rounded-lg border border-gray-100 p-3 text-sm sm:flex-row sm:items-start sm:justify-between'
                    >
                        <div className='flex-1'>
                            <div className='flex flex-wrap items-center gap-2'>
                                <TaskTypeBadge type={t.type} />
                                <span
                                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${TASK_STATUS_COLORS[t.status]}`}
                                >
                                    {TASK_STATUS_LABELS[t.status]}
                                </span>
                            </div>
                            <p className='mt-1 font-medium text-night_green'>{t.title}</p>
                            {t.description && (
                                <p className='mt-0.5 text-xs text-gray-600'>{t.description}</p>
                            )}
                            <p className='mt-1 text-xs text-gray-500'>
                                {fmtRange(t)} · {fullName(t.assignee)}
                            </p>
                            {t.result && (
                                <p className='mt-1 text-xs italic text-gray-600'>
                                    Результат: {t.result}
                                </p>
                            )}
                        </div>
                        {t.status === "OPEN" && canClose(t) && (
                            <button
                                type='button'
                                onClick={() => setClosing(t)}
                                className='rounded-md border border-gray-300 px-3 py-1 text-xs text-gray-700 hover:bg-gray-100'
                            >
                                Закрыть
                            </button>
                        )}
                    </li>
                ))}
            </ul>

            {closing && (
                <TaskCloseModal
                    task={closing}
                    onClose={() => setClosing(null)}
                    onClosed={() => {
                        setClosing(null)
                        load()
                    }}
                />
            )}
        </section>
    )
}
