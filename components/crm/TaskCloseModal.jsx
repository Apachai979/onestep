"use client"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { LuPencil } from "react-icons/lu"
import {
    TASK_STATUS_COLORS,
    TASK_STATUS_LABELS,
    isTaskOverdue,
    taskDueRelativeLabel,
    taskRangeLabel,
} from "@/lib/crm/task"
import { formatCrmDateTime } from "@/lib/crm/datetime"
import TaskScheduleFields, {
    needsAdvanced,
    scheduleFromTask,
} from "./TaskScheduleFields"
import { notifyTasksChanged } from "@/lib/crm/tasks-events"
import { dealDisplayTitle } from "@/lib/crm/deal"
import { TaskTypeBadge } from "./TaskTypeIcon"
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

function humanDiff(ms) {
    const abs = Math.abs(ms)
    const days = Math.floor(abs / 86_400_000)
    const hours = Math.floor((abs % 86_400_000) / 3_600_000)
    const mins = Math.floor((abs % 3_600_000) / 60_000)
    if (days >= 1) return `${days} дн${days === 1 ? "" : days < 5 ? "я" : "ей"} ${hours} ч`
    if (hours >= 1) return `${hours} ч ${mins} мин`
    return `${mins} мин`
}

const TONE_OVERDUE = "bg-red-100 text-red-700 border border-red-200"
const TONE_SOON = "bg-amber-50 text-amber-800 border border-amber-200"
const TONE_LATER = "bg-blue-50 text-blue-700 border border-blue-100"

function timeStatus(t) {
    const now = Date.now()
    const end = new Date(t.endAt).getTime()
    const start = new Date(t.startAt).getTime()
    const overdue = isTaskOverdue(t)

    // У задачи на весь день счёт идёт в днях: «осталось 4 ч» при сроке
    // «до конца дня» выглядит тревогой на пустом месте.
    if (t.allDay) {
        const hint = taskDueRelativeLabel(t)
        if (!hint) return { label: "Срок истёк", className: TONE_LATER }
        const label = hint.charAt(0).toUpperCase() + hint.slice(1)
        if (overdue) return { label, className: TONE_OVERDUE }
        return {
            label: `Срок: ${hint}`,
            className: hint === "сегодня" ? TONE_SOON : TONE_LATER,
        }
    }

    if (overdue) {
        return { label: `Просрочена на ${humanDiff(now - end)}`, className: TONE_OVERDUE }
    }
    if (start > now) {
        return { label: `Начнётся через ${humanDiff(start - now)}`, className: TONE_LATER }
    }
    return { label: `Осталось ${humanDiff(end - now)}`, className: TONE_SOON }
}

function relationLink(t) {
    if (t.deal)
        return {
            href: `/crm/deals/${t.deal.id}`,
            label: dealDisplayTitle(t.deal, t.deal.counterparty?.name),
            kind: "Сделка",
        }
    if (t.project)
        return {
            href: `/crm/projects/${t.project.id}`,
            label: t.project.internalName,
            kind: "Проект",
        }
    if (t.distributor)
        return {
            href: `/crm/counterparties/${t.distributor.id}`,
            label: t.distributor.name,
            kind: "Дистрибьютор",
        }
    if (t.endCustomer)
        return {
            href: `/crm/counterparties/${t.endCustomer.id}`,
            label: t.endCustomer.name,
            kind: "Конечный потребитель",
        }
    return null
}

export default function TaskCloseModal({
    task,
    onClose,
    onClosed,
    canClose = true,
    canReopen = false,
}) {
    // Результат не выбран по умолчанию: «выполнена» не должна проставляться
    // сама — менеджер обязан отметить исход руками.
    const [status, setStatus] = useState(null)
    const [result, setResult] = useState("")
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)
    const [reopening, setReopening] = useState(false)

    // Правка срока прямо в карточке: перенести задачу — самое частое, что с ней
    // делают, и ради этого не должно быть нужно пересоздавать её.
    const [editingDue, setEditingDue] = useState(false)
    const [schedule, setSchedule] = useState(() => scheduleFromTask(task))
    const [scheduleAdvanced, setScheduleAdvanced] = useState(() =>
        needsAdvanced(scheduleFromTask(task)),
    )
    const [savingDue, setSavingDue] = useState(false)

    // Комментарий о результате остаётся редактируемым и после закрытия: дописать
    // забытую деталь не должно стоить возврата задачи в работу — он стирает
    // результат. Права те же, что на возврат.
    const [editingResult, setEditingResult] = useState(false)
    const [resultDraft, setResultDraft] = useState("")
    const [savingResult, setSavingResult] = useState(false)
    const resultRef = useRef(null)

    // Курсор — в конец текста: комментарий чаще дописывают, а не переписывают,
    // и autoFocus сам по себе ставит каретку в начало.
    useEffect(() => {
        if (!editingResult) return
        const el = resultRef.current
        if (!el) return
        el.focus()
        const end = el.value.length
        el.setSelectionRange(end, end)
        el.scrollTop = el.scrollHeight
    }, [editingResult])

    const ts = timeStatus(task)
    const rel = relationLink(task)
    const readOnly = !canClose
    const canEditDue = task.status === "OPEN" && canClose
    const canEditResult = task.status !== "OPEN" && canReopen

    function startEditingDue() {
        setError("")
        const current = scheduleFromTask(task)
        setSchedule(current)
        setScheduleAdvanced(needsAdvanced(current))
        setEditingDue(true)
    }

    async function saveDue() {
        setError("")
        setSavingDue(true)
        const res = await fetch(`/api/crm/tasks/${task.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(schedule),
        })
        const text = await res.text()
        const data = text ? safeJson(text) : {}
        setSavingDue(false)
        if (!res.ok) {
            setError(data?.error || "Не удалось изменить срок")
            return
        }
        setEditingDue(false)
        notifyTasksChanged()
        if (onClosed) onClosed(data.item)
    }

    function startEditingResult() {
        setError("")
        setResultDraft(task.result || "")
        setEditingResult(true)
    }

    async function saveResult() {
        setError("")
        if (task.status === "FAILED" && !resultDraft.trim()) {
            setError("У невыполненной задачи комментарий обязателен")
            return
        }
        setSavingResult(true)
        const res = await fetch(`/api/crm/tasks/${task.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ result: resultDraft }),
        })
        const text = await res.text()
        const data = text ? safeJson(text) : {}
        setSavingResult(false)
        if (!res.ok) {
            setError(data?.error || "Не удалось сохранить комментарий")
            return
        }
        setEditingResult(false)
        notifyTasksChanged()
        if (onClosed) onClosed(data.item)
    }

    async function reopen() {
        setError("")
        setReopening(true)
        const res = await fetch(`/api/crm/tasks/${task.id}/close`, { method: "DELETE" })
        const text = await res.text()
        const data = text ? safeJson(text) : {}
        setReopening(false)
        if (!res.ok) {
            setError(data?.error || "Не удалось вернуть задачу в работу")
            return
        }
        notifyTasksChanged()
        if (onClosed) onClosed(data.item)
    }

    async function submit(e) {
        e.preventDefault()
        setError("")
        if (!status) {
            setError("Отметьте результат: выполнена или не выполнена")
            return
        }
        setLoading(true)
        const res = await fetch(`/api/crm/tasks/${task.id}/close`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status, result }),
        })
        const text = await res.text()
        const data = text ? safeJson(text) : {}
        setLoading(false)
        if (!res.ok) {
            setError(data?.error || "Не удалось закрыть задачу")
            return
        }
        notifyTasksChanged()
        if (onClosed) onClosed(data.item)
    }

    return (
        <div
            className='fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 p-4 backdrop-blur-sm animate-apparition'
            onClick={onClose}
        >
            <form
                onSubmit={submit}
                onClick={e => e.stopPropagation()}
                className='w-full max-w-md space-y-4 rounded-2xl border border-line bg-white p-6 shadow-2xl shadow-neutral-900/20 animate-emersion'
            >
                <div className='space-y-2 border-b border-line pb-3'>
                    <div className='flex flex-wrap items-center gap-2'>
                        <TaskTypeBadge type={task.type} />
                        {task.status === "OPEN" ? (
                            <Badge className={ts.className}>{ts.label}</Badge>
                        ) : (
                            <Badge className={TASK_STATUS_COLORS[task.status]}>
                                {TASK_STATUS_LABELS[task.status] || task.status}
                            </Badge>
                        )}
                    </div>
                    <h2 className='text-lg font-semibold text-neutral-900'>{task.title}</h2>
                    {task.description && (
                        <p className='text-sm text-neutral-500'>{task.description}</p>
                    )}
                    <dl className='grid gap-1.5 text-sm sm:grid-cols-2'>
                        {!editingDue && (
                            <div>
                                <dt className='flex items-center gap-2 text-xs uppercase text-neutral-400'>
                                    Срок
                                    {canEditDue && (
                                        <button
                                            type='button'
                                            onClick={startEditingDue}
                                            className='normal-case text-brand_main hover:underline'
                                        >
                                            изменить
                                        </button>
                                    )}
                                </dt>
                                <dd className='mt-0.5 text-neutral-800'>
                                    {taskRangeLabel(task)}
                                </dd>
                            </div>
                        )}
                        {editingDue && (
                            <div className='rounded-xl border border-line bg-surface_muted p-3 sm:col-span-2'>
                                <TaskScheduleFields
                                    value={schedule}
                                    onChange={setSchedule}
                                    advanced={scheduleAdvanced}
                                    onAdvancedChange={setScheduleAdvanced}
                                    dense
                                />
                                <div className='mt-3 flex justify-end gap-2'>
                                    <Button
                                        type='button'
                                        variant='secondary'
                                        size='sm'
                                        onClick={() => setEditingDue(false)}
                                    >
                                        Отмена
                                    </Button>
                                    <Button
                                        type='button'
                                        size='sm'
                                        loading={savingDue}
                                        onClick={saveDue}
                                    >
                                        Сохранить срок
                                    </Button>
                                </div>
                            </div>
                        )}
                        <Row label='Ответственный' value={fullName(task.assignee)} />
                        {task.createdBy && (
                            <Row label='Поставил' value={fullName(task.createdBy)} />
                        )}
                        {rel && (
                            <div className='sm:col-span-2'>
                                <dt className='text-xs uppercase text-neutral-400'>
                                    {rel.kind}
                                </dt>
                                <dd className='mt-0.5'>
                                    <Link
                                        href={rel.href}
                                        onClick={onClose}
                                        className='text-neutral-800 underline hover:text-brand_main'
                                    >
                                        {rel.label}
                                    </Link>
                                </dd>
                            </div>
                        )}
                    </dl>
                </div>

                {task.status !== "OPEN" && (
                    <div
                        className={`rounded-xl border p-3 text-sm ${
                            task.status === "DONE"
                                ? "border-emerald-200 bg-emerald-50/50"
                                : "border-red-200 bg-red-50/50"
                        }`}
                    >
                        <div className='flex items-center justify-between gap-2'>
                            <span className='text-xs font-semibold uppercase tracking-wide text-neutral-500'>
                                Комментарий о {task.status === "DONE" ? "выполнении" : "невыполнении"}
                            </span>
                            {task.closedAt && (
                                <span className='text-[11px] text-neutral-400'>
                                    закрыто {formatCrmDateTime(task.closedAt)}
                                </span>
                            )}
                        </div>
                        {editingResult ? (
                            <div className='mt-2'>
                                <textarea
                                    ref={resultRef}
                                    rows={4}
                                    value={resultDraft}
                                    onChange={e => setResultDraft(e.target.value)}
                                    className='w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm transition-all duration-200 placeholder:text-neutral-400 focus:border-brand_main focus:outline-none focus:ring-2 focus:ring-brand_main/20'
                                />
                                <div className='mt-2 flex justify-end gap-2'>
                                    <Button
                                        type='button'
                                        variant='secondary'
                                        size='sm'
                                        onClick={() => setEditingResult(false)}
                                    >
                                        Отмена
                                    </Button>
                                    <Button
                                        type='button'
                                        size='sm'
                                        loading={savingResult}
                                        onClick={saveResult}
                                    >
                                        Сохранить комментарий
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <p className='mt-1 whitespace-pre-wrap text-neutral-700'>
                                    {task.result || (
                                        <span className='italic text-neutral-400'>
                                            Комментарий не оставлен
                                        </span>
                                    )}
                                </p>
                                {canEditResult && (
                                    <div className='mt-1 flex justify-end'>
                                        <button
                                            type='button'
                                            onClick={startEditingResult}
                                            title={
                                                task.result
                                                    ? "Изменить комментарий"
                                                    : "Добавить комментарий"
                                            }
                                            className='inline-flex h-6 w-6 items-center justify-center rounded text-neutral-400 transition-colors hover:bg-white hover:text-neutral-900'
                                        >
                                            <LuPencil className='h-3.5 w-3.5' />
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}

                {!readOnly && (
                    <>
                        <div>
                            <label className='mb-1.5 block text-sm text-neutral-600'>
                                Результат
                            </label>
                            <div className='flex gap-2'>
                                <button
                                    type='button'
                                    onClick={() => setStatus("DONE")}
                                    className={`flex-1 rounded-xl border px-3 py-2 text-sm transition-colors ${
                                        status === "DONE"
                                            ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                                            : "border-line text-neutral-600 hover:bg-surface_muted"
                                    }`}
                                >
                                    Выполнена
                                </button>
                                <button
                                    type='button'
                                    onClick={() => setStatus("FAILED")}
                                    className={`flex-1 rounded-xl border px-3 py-2 text-sm transition-colors ${
                                        status === "FAILED"
                                            ? "border-red-500 bg-red-50 text-red-700"
                                            : "border-line text-neutral-600 hover:bg-surface_muted"
                                    }`}
                                >
                                    Не выполнена
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className='mb-1.5 block text-sm text-neutral-600'>
                                Комментарий{" "}
                                {status === "FAILED" && (
                                    <span className='text-red-600'>*</span>
                                )}
                            </label>
                            <textarea
                                rows={4}
                                value={result}
                                onChange={e => setResult(e.target.value)}
                                required={status === "FAILED"}
                                placeholder={
                                    status === "FAILED"
                                        ? "Почему не получилось"
                                        : status === "DONE"
                                          ? "Что сделали (опц.)"
                                          : "Комментарий (опц.)"
                                }
                                className='w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm transition-all duration-200 placeholder:text-neutral-400 focus:border-brand_main focus:outline-none focus:ring-2 focus:ring-brand_main/20'
                            />
                        </div>
                    </>
                )}

                {error && <p className='text-sm text-red-600'>{error}</p>}

                <div className='flex flex-wrap justify-end gap-2'>
                    {task.status !== "OPEN" && canReopen && (
                        <Button
                            type='button'
                            variant='secondary'
                            loading={reopening}
                            onClick={reopen}
                            title='Комментарий о результате будет очищен'
                            className='mr-auto'
                        >
                            Вернуть в работу
                        </Button>
                    )}
                    <Button type='button' variant='secondary' onClick={onClose}>
                        {readOnly ? "Закрыть" : "Отмена"}
                    </Button>
                    {!readOnly && (
                        <Button
                            type='submit'
                            loading={loading}
                            disabled={!status}
                            title={
                                status
                                    ? undefined
                                    : "Сначала отметьте результат задачи"
                            }
                        >
                            Закрыть задачу
                        </Button>
                    )}
                </div>
            </form>
        </div>
    )
}

function Row({ label, value }) {
    return (
        <div>
            <dt className='text-xs uppercase text-neutral-400'>{label}</dt>
            <dd className='mt-0.5 text-neutral-800'>{value}</dd>
        </div>
    )
}
