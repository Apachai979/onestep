"use client"
import Link from "next/link"
import { useState } from "react"
import {
    TASK_STATUS_COLORS,
    TASK_STATUS_LABELS,
    allDayDateLabel,
} from "@/lib/crm/task"
import { notifyTasksChanged } from "@/lib/crm/tasks-events"
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

function humanDiff(ms) {
    const abs = Math.abs(ms)
    const days = Math.floor(abs / 86_400_000)
    const hours = Math.floor((abs % 86_400_000) / 3_600_000)
    const mins = Math.floor((abs % 3_600_000) / 60_000)
    if (days >= 1) return `${days} дн${days === 1 ? "" : days < 5 ? "я" : "ей"} ${hours} ч`
    if (hours >= 1) return `${hours} ч ${mins} мин`
    return `${mins} мин`
}

function timeStatus(t) {
    const now = Date.now()
    const end = new Date(t.endAt).getTime()
    const start = new Date(t.startAt).getTime()

    if (end < now) {
        return {
            label: `Просрочена на ${humanDiff(now - end)}`,
            className: "bg-red-100 text-red-700 border border-red-200",
        }
    }
    if (start > now) {
        return {
            label: `Начнётся через ${humanDiff(start - now)}`,
            className: "bg-blue-50 text-blue-700 border border-blue-100",
        }
    }
    return {
        label: `Осталось ${humanDiff(end - now)}`,
        className: "bg-amber-50 text-amber-800 border border-amber-200",
    }
}

function relationLink(t) {
    if (t.deal)
        return {
            href: `/crm/deals/${t.deal.id}`,
            label: t.deal.title || `Сделка с ${t.deal.counterparty?.name || "клиентом"}`,
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
    const [status, setStatus] = useState("DONE")
    const [result, setResult] = useState("")
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)
    const [reopening, setReopening] = useState(false)

    const ts = timeStatus(task)
    const rel = relationLink(task)
    const readOnly = !canClose

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
                        <Row label='Срок' value={fmtRange(task)} />
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
                                    закрыто{" "}
                                    {new Date(task.closedAt).toLocaleString("ru-RU", {
                                        dateStyle: "short",
                                        timeStyle: "short",
                                    })}
                                </span>
                            )}
                        </div>
                        <p className='mt-1 whitespace-pre-wrap text-neutral-700'>
                            {task.result || (
                                <span className='italic text-neutral-400'>
                                    Комментарий не оставлен
                                </span>
                            )}
                        </p>
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
                                        : "Что сделали (опц.)"
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
                            className='mr-auto'
                        >
                            Вернуть в работу
                        </Button>
                    )}
                    <Button type='button' variant='secondary' onClick={onClose}>
                        {readOnly ? "Закрыть" : "Отмена"}
                    </Button>
                    {!readOnly && (
                        <Button type='submit' loading={loading}>
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
