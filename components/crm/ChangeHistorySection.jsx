"use client"
import { useEffect, useState } from "react"
import { CHANGE_ACTION_LABELS, ENTITY_LABELS, fieldLabel } from "@/lib/crm/change-log"

function safeJson(text) {
    try {
        return JSON.parse(text)
    } catch {
        return null
    }
}

function fullName(u) {
    if (!u) return "—"
    return `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email || "Система"
}

function fmtDate(d) {
    return new Date(d).toLocaleString("ru-RU", {
        dateStyle: "short",
        timeStyle: "short",
    })
}

function formatValue(v) {
    if (v === null || v === undefined) return "—"
    const s = String(v)
    if (s.length > 80) return s.slice(0, 80) + "…"
    return s
}

const ACTION_COLOR = {
    CREATE: "bg-green-100 text-green-800",
    UPDATE: "bg-blue-100 text-blue-800",
    DELETE: "bg-red-100 text-red-700",
}

export default function ChangeHistorySection({ entityType, entityId, includeChildren = false }) {
    const [open, setOpen] = useState(false)
    const [items, setItems] = useState(null)
    const [error, setError] = useState("")

    async function load() {
        setError("")
        const params = new URLSearchParams({ entityType, entityId })
        if (includeChildren) params.set("includeChildren", "1")
        const r = await fetch(`/api/crm/change-logs?${params.toString()}`)
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
        if (open && items === null) load()
    }, [open])

    return (
        <section className='rounded-xl border border-gray-200 bg-white'>
            <button
                type='button'
                onClick={() => setOpen(o => !o)}
                className='flex w-full items-center justify-between px-5 py-3 text-left'
            >
                <span className='text-sm font-semibold uppercase tracking-wide text-gray-500'>
                    История изменений
                </span>
                <span className='text-xs text-gray-400'>{open ? "Скрыть ▴" : "Показать ▾"}</span>
            </button>

            {open && (
                <div className='border-t border-gray-100 p-5'>
                    {error && <p className='text-sm text-red-600'>{error}</p>}
                    {items === null && (
                        <p className='text-sm text-gray-400'>Загрузка...</p>
                    )}
                    {items?.length === 0 && (
                        <p className='text-sm text-gray-400'>Записей нет.</p>
                    )}
                    <ul className='space-y-3'>
                        {items?.map(it => {
                            const changes = it.changes
                            const isDiff =
                                it.action === "UPDATE" &&
                                changes &&
                                typeof changes === "object" &&
                                !Array.isArray(changes)
                            return (
                                <li
                                    key={it.id}
                                    className='rounded-lg border border-gray-100 p-3 text-sm'
                                >
                                    <div className='flex flex-wrap items-center gap-2 text-xs text-gray-500'>
                                        <span>{fmtDate(it.createdAt)}</span>
                                        <span>·</span>
                                        <span className='font-medium text-night_green'>
                                            {fullName(it.author)}
                                        </span>
                                        <span
                                            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${ACTION_COLOR[it.action] || ""}`}
                                        >
                                            {CHANGE_ACTION_LABELS[it.action] || it.action}
                                        </span>
                                        {it.entityType !== entityType && (
                                            <span className='rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-700'>
                                                {ENTITY_LABELS[it.entityType] || it.entityType}
                                            </span>
                                        )}
                                    </div>
                                    {isDiff && (
                                        <ul className='mt-2 space-y-1 text-xs'>
                                            {Object.entries(changes).map(([field, val]) => (
                                                <li key={field}>
                                                    <span className='text-gray-700'>
                                                        {fieldLabel(it.entityType, field)}:
                                                    </span>{" "}
                                                    <span className='text-gray-500 line-through'>
                                                        {formatValue(val.from)}
                                                    </span>{" "}
                                                    <span className='text-gray-400'>→</span>{" "}
                                                    <span className='font-medium text-gray-900'>
                                                        {formatValue(val.to)}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                    {!isDiff && changes && (
                                        <details className='mt-2 text-xs text-gray-600'>
                                            <summary className='cursor-pointer'>
                                                Подробности
                                            </summary>
                                            <pre className='mt-1 max-h-60 overflow-auto whitespace-pre-wrap rounded bg-gray-50 p-2 text-[11px]'>
                                                {JSON.stringify(changes, null, 2)}
                                            </pre>
                                        </details>
                                    )}
                                </li>
                            )
                        })}
                    </ul>
                </div>
            )}
        </section>
    )
}
