"use client"
import { useCallback, useEffect, useState } from "react"
import {
    TASK_STATUS_COLORS,
    TASK_STATUS_LABELS,
    allDayDateLabel,
} from "@/lib/crm/task"
import { TaskTypeBadge } from "./TaskTypeIcon"
import TaskForm from "./TaskForm"
import TaskCloseModal from "./TaskCloseModal"
import { Badge, Button } from "@/components/crm/ui"

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
    bare = false,
    onCountChange,
}) {
    const [items, setItems] = useState(null)
    const [creating, setCreating] = useState(false)
    const [closing, setClosing] = useState(null)
    const [error, setError] = useState("")

    const load = useCallback(async () => {
        setError("")
        const params = new URLSearchParams()
        if (relationKind === "deal") params.set("dealId", relationId)
        else if (relationKind === "project") params.set("projectId", relationId)
        else if (relationKind === "auction") params.set("auctionId", relationId)
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
    }, [relationKind, relationId])

    useEffect(() => {
        load()
    }, [load])

    useEffect(() => {
        if (onCountChange && items) {
            onCountChange(items.filter(t => t.status !== "DONE").length)
        }
    }, [items, onCountChange])

    function canClose(t) {
        if (currentUserRole === "ADMIN") return true
        return t.assigneeId === currentUserId || t.createdById === currentUserId
    }

    const Wrapper = bare ? "div" : "section"
    const wrapperCls = bare ? "" : "rounded-2xl border border-line bg-white p-6 shadow-sm"

    return (
        <Wrapper className={wrapperCls}>
            <div className='mb-4 flex items-center justify-between'>
                {bare ? (
                    <span />
                ) : (
                    <h2 className='text-sm font-semibold text-neutral-900'>Задачи</h2>
                )}
                {!creating && (
                    <Button type='button' size='sm' onClick={() => setCreating(true)}>
                        + Задача
                    </Button>
                )}
            </div>

            {error && <p className='text-sm text-red-600'>{error}</p>}

            {creating && (
                <div className='mb-4 rounded-xl border border-dashed border-brand_main/40 bg-surface_muted p-4'>
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

            {items === null && <p className='text-sm text-neutral-400'>Загрузка...</p>}
            {items !== null && items.filter(t => t.status !== "DONE").length === 0 && (
                <p className='text-sm text-neutral-400'>Активных задач нет.</p>
            )}

            <ul className='space-y-2'>
                {items
                    ?.filter(t => t.status !== "DONE")
                    .map(t => {
                        return (
                            <li
                                key={t.id}
                                onClick={() => setClosing(t)}
                                className='cursor-pointer rounded-xl border border-line p-3 text-sm transition-colors hover:bg-surface_muted'
                                title='Открыть задачу'
                            >
                                <div className='flex flex-wrap items-center gap-2'>
                                    <TaskTypeBadge type={t.type} />
                                    <Badge className={TASK_STATUS_COLORS[t.status]}>
                                        {TASK_STATUS_LABELS[t.status]}
                                    </Badge>
                                    <span className='text-xs text-neutral-500'>
                                        {fmtRange(t)}
                                    </span>
                                </div>
                                <p className='mt-1 font-medium text-neutral-900'>{t.title}</p>
                                {t.description && (
                                    <p className='mt-0.5 text-xs text-neutral-500'>
                                        {t.description}
                                    </p>
                                )}
                                <p className='mt-1 text-xs text-neutral-500'>
                                    {fullName(t.assignee)}
                                </p>
                                {t.result && (
                                    <p className='mt-1 text-xs italic text-neutral-500'>
                                        Результат: {t.result}
                                    </p>
                                )}
                            </li>
                        )
                    })}
            </ul>

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
        </Wrapper>
    )
}
