"use client"
import Link from "next/link"
import { useState } from "react"
import { allDayDateLabel } from "@/lib/crm/task"
import { notifyTasksChanged } from "@/lib/crm/tasks-events"
import { TaskTypeBadge } from "./TaskTypeIcon"

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

export default function TaskCloseModal({ task, onClose, onClosed }) {
    const [status, setStatus] = useState("DONE")
    const [result, setResult] = useState("")
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)

    const ts = timeStatus(task)
    const rel = relationLink(task)

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
            className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4'
            onClick={onClose}
        >
            <form
                onSubmit={submit}
                onClick={e => e.stopPropagation()}
                className='w-full max-w-md space-y-4 rounded-xl bg-white p-5 shadow-2xl'
            >
                <div className='space-y-2 border-b border-gray-100 pb-3'>
                    <div className='flex flex-wrap items-center gap-2'>
                        <TaskTypeBadge type={task.type} />
                        <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ts.className}`}
                        >
                            {ts.label}
                        </span>
                    </div>
                    <h2 className='text-lg font-semibold text-night_green'>{task.title}</h2>
                    {task.description && (
                        <p className='text-sm text-gray-600'>{task.description}</p>
                    )}
                    <dl className='grid gap-1.5 text-sm sm:grid-cols-2'>
                        <Row label='Срок' value={fmtRange(task)} />
                        <Row label='Ответственный' value={fullName(task.assignee)} />
                        {task.createdBy && (
                            <Row label='Поставил' value={fullName(task.createdBy)} />
                        )}
                        {rel && (
                            <div className='sm:col-span-2'>
                                <dt className='text-xs uppercase text-gray-500'>
                                    {rel.kind}
                                </dt>
                                <dd className='mt-0.5'>
                                    <Link
                                        href={rel.href}
                                        onClick={onClose}
                                        className='text-night_green underline hover:text-primary_green'
                                    >
                                        {rel.label}
                                    </Link>
                                </dd>
                            </div>
                        )}
                    </dl>
                </div>

                <div>
                    <label className='mb-1 block text-sm text-gray-700'>Результат</label>
                    <div className='flex gap-2'>
                        <button
                            type='button'
                            onClick={() => setStatus("DONE")}
                            className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
                                status === "DONE"
                                    ? "border-green-500 bg-green-50 text-green-800"
                                    : "border-gray-300 text-gray-700 hover:bg-gray-50"
                            }`}
                        >
                            Выполнена
                        </button>
                        <button
                            type='button'
                            onClick={() => setStatus("FAILED")}
                            className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
                                status === "FAILED"
                                    ? "border-red-500 bg-red-50 text-red-800"
                                    : "border-gray-300 text-gray-700 hover:bg-gray-50"
                            }`}
                        >
                            Не выполнена
                        </button>
                    </div>
                </div>

                <div>
                    <label className='mb-1 block text-sm text-gray-700'>
                        Комментарий{" "}
                        {status === "FAILED" && <span className='text-red-600'>*</span>}
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
                        className='w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary_green focus:outline-none'
                    />
                </div>

                {error && <p className='text-sm text-red-600'>{error}</p>}

                <div className='flex justify-end gap-2'>
                    <button
                        type='button'
                        onClick={onClose}
                        className='rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100'
                    >
                        Отмена
                    </button>
                    <button
                        type='submit'
                        disabled={loading}
                        className='rounded-lg bg-primary_green px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-contrast_green disabled:opacity-60'
                    >
                        {loading ? "Закрываем..." : "Закрыть задачу"}
                    </button>
                </div>
            </form>
        </div>
    )
}

function Row({ label, value }) {
    return (
        <div>
            <dt className='text-xs uppercase text-gray-500'>{label}</dt>
            <dd className='mt-0.5 text-gray-800'>{value}</dd>
        </div>
    )
}
