"use client"
import { useCallback, useEffect, useState } from "react"
import { LuChevronDown } from "react-icons/lu"
import {
    TASK_DUE_COLORS,
    TASK_STATUS_COLORS,
    TASK_STATUS_LABELS,
    taskDueRelativeLabel,
    taskDueState,
    taskRangeLabel,
} from "@/lib/crm/task"
import { formatCrmDateTime } from "@/lib/crm/datetime"
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
    // Развёрнуто по умолчанию: результат работы по карточке нужен сразу, а не
    // по клику. Свернуть можно — состояние живёт до перезагрузки страницы.
    const [showDone, setShowDone] = useState(true)
    const [error, setError] = useState("")

    const load = useCallback(async () => {
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
    }, [relationKind, relationId])

    useEffect(() => {
        load()
    }, [load])

    useEffect(() => {
        if (onCountChange && items) {
            onCountChange(items.filter(t => t.status === "OPEN").length)
        }
    }, [items, onCountChange])

    function canClose(t) {
        if (currentUserRole === "ADMIN") return true
        return t.assigneeId === currentUserId || t.createdById === currentUserId
    }

    const Wrapper = bare ? "div" : "section"
    const wrapperCls = bare ? "" : "rounded-2xl border border-line bg-white p-6 shadow-sm"

    // Закрытые задачи не прячем совсем: комментарий о результате — это итог
    // работы по карточке, и он должен читаться отсюда, а не только из журнала
    // изменений. Выполненные и невыполненные лежат вместе — и те и другие
    // завершены, а исход виден по бейджу. Свежие сверху — по дате закрытия.
    const active = items?.filter(t => t.status === "OPEN") ?? []
    const done = (items?.filter(t => t.status !== "OPEN") ?? [])
        .slice()
        .sort((a, b) => new Date(b.closedAt ?? b.endAt) - new Date(a.closedAt ?? a.endAt))

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
            {items !== null && active.length === 0 && (
                <p className='text-sm text-neutral-400'>Активных задач нет.</p>
            )}

            <ul className='space-y-2'>
                {active.map(t => (
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
                            <span className={`text-xs ${TASK_DUE_COLORS[taskDueState(t)]}`}>
                                {taskRangeLabel(t)}
                                {taskDueRelativeLabel(t) && (
                                    <span className='ml-1 opacity-70'>
                                        · {taskDueRelativeLabel(t)}
                                    </span>
                                )}
                            </span>
                        </div>
                        <p className='mt-1 font-medium text-neutral-900'>{t.title}</p>
                        {t.description && (
                            <p className='mt-0.5 text-xs text-neutral-500'>{t.description}</p>
                        )}
                        <p className='mt-1 text-xs text-neutral-500'>{fullName(t.assignee)}</p>
                    </li>
                ))}
            </ul>

            {done.length > 0 && (
                <div className='mt-3 border-t border-line pt-3'>
                    <button
                        type='button'
                        onClick={() => setShowDone(v => !v)}
                        className='flex w-full items-center gap-1.5 text-xs font-medium text-neutral-500 transition-colors hover:text-neutral-900'
                    >
                        <LuChevronDown
                            className={`h-3.5 w-3.5 transition-transform ${
                                showDone ? "" : "-rotate-90"
                            }`}
                        />
                        Завершённые ({done.length})
                    </button>

                    {showDone && (
                        <ul className='mt-2 space-y-2'>
                            {done.map(t => (
                                <li
                                    key={t.id}
                                    onClick={() => setClosing(t)}
                                    className='cursor-pointer rounded-xl border border-line bg-surface_muted/50 p-3 text-sm transition-colors hover:bg-surface_muted'
                                    title='Открыть задачу'
                                >
                                    <div className='flex flex-wrap items-center gap-2'>
                                        <TaskTypeBadge type={t.type} />
                                        <Badge className={TASK_STATUS_COLORS[t.status]}>
                                            {TASK_STATUS_LABELS[t.status]}
                                        </Badge>
                                        {t.closedAt && (
                                            <span className='text-xs text-neutral-400'>
                                                {formatCrmDateTime(t.closedAt)}
                                            </span>
                                        )}
                                    </div>
                                    <p className='mt-1 font-medium text-neutral-900'>
                                        {t.title}
                                    </p>
                                    <p className='mt-0.5 text-xs text-neutral-500'>
                                        {fullName(t.assignee)}
                                    </p>
                                    {t.result ? (
                                        <p
                                            className={`mt-1.5 whitespace-pre-wrap border-l-2 pl-2 text-xs text-neutral-700 ${
                                                t.status === "DONE"
                                                    ? "border-emerald-300"
                                                    : "border-red-300"
                                            }`}
                                        >
                                            {t.result}
                                        </p>
                                    ) : (
                                        <p className='mt-1.5 text-xs italic text-neutral-400'>
                                            Комментарий не оставлен
                                        </p>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}

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
