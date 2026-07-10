"use client"
import { useCallback, useEffect, useState } from "react"
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
    UPDATE: "bg-blue-100 text-blue-700",
    DELETE: "bg-red-100 text-red-700",
}

// Категории для фильтра ленты.
const FILTER_OF = {
    Task: "tasks",
    Note: "notes",
    Attachment: "files",
    Email: "mail",
}

const FILTERS = [
    ["all", "Все"],
    ["card", "Карточка"],
    ["tasks", "Задачи"],
    ["notes", "Заметки"],
    ["files", "Файлы"],
    ["mail", "КП"],
]

function categoryOf(it) {
    return FILTER_OF[it.entityType] || "card"
}

function isDiffValue(v) {
    return v && typeof v === "object" && ("from" in v || "to" in v)
}

// Компактная лента истории изменений. Встраивается вкладкой в «Активность»:
// грузится лениво — при первом открытии вкладки (prop `active`).
export default function ChangeHistorySection({
    entityType,
    entityId,
    includeChildren = false,
    active = true,
}) {
    const [items, setItems] = useState(null)
    const [error, setError] = useState("")
    const [filter, setFilter] = useState("all")

    const load = useCallback(async () => {
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
    }, [entityType, entityId, includeChildren])

    useEffect(() => {
        if (active && items === null) load()
    }, [active, items, load])

    const presentCategories = new Set((items || []).map(categoryOf))
    const visible =
        filter === "all" ? items : items?.filter(it => categoryOf(it) === filter)

    return (
        <div>
            {error && <p className='text-sm text-red-600'>{error}</p>}
            {items === null && <p className='text-sm text-neutral-400'>Загрузка...</p>}
            {items?.length === 0 && (
                <p className='text-sm text-neutral-400'>Записей нет.</p>
            )}

            {items?.length > 0 && presentCategories.size > 1 && (
                <div className='mb-2 flex flex-wrap gap-1'>
                    {FILTERS.filter(
                        ([key]) => key === "all" || presentCategories.has(key),
                    ).map(([key, label]) => (
                        <button
                            key={key}
                            type='button'
                            onClick={() => setFilter(key)}
                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition ${
                                filter === key
                                    ? "bg-brand_main text-white"
                                    : "bg-surface_muted text-neutral-500 hover:bg-surface_hover"
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            )}

            <ul>
                {visible?.map(it => {
                    const changes =
                        it.changes && typeof it.changes === "object" && !Array.isArray(it.changes)
                            ? it.changes
                            : null
                    return (
                        <li
                            key={it.id}
                            className='border-b border-line py-2 first:pt-0 last:border-b-0'
                        >
                            <div className='flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] text-neutral-500'>
                                <span
                                    className={`rounded-full px-1.5 py-px text-[10px] font-medium ${ACTION_COLOR[it.action] || ""}`}
                                >
                                    {CHANGE_ACTION_LABELS[it.action] || it.action}
                                </span>
                                {it.entityType !== entityType && (
                                    <span className='rounded-full bg-neutral-100 px-1.5 py-px text-[10px] font-medium text-neutral-700'>
                                        {ENTITY_LABELS[it.entityType] || it.entityType}
                                    </span>
                                )}
                                <span className='font-medium text-neutral-900'>
                                    {fullName(it.author)}
                                </span>
                                <span>·</span>
                                <span>{fmtDate(it.createdAt)}</span>
                            </div>
                            {changes && (
                                <ul className='mt-1 space-y-0.5 text-xs leading-snug'>
                                    {Object.entries(changes).map(([field, val]) => {
                                        if (isDiffValue(val)) {
                                            return (
                                                <li key={field}>
                                                    <span className='text-neutral-500'>
                                                        {fieldLabel(it.entityType, field)}:
                                                    </span>{" "}
                                                    <span className='text-neutral-400 line-through'>
                                                        {formatValue(val.from)}
                                                    </span>{" "}
                                                    <span className='text-neutral-400'>→</span>{" "}
                                                    <span className='font-medium text-neutral-800'>
                                                        {formatValue(val.to)}
                                                    </span>
                                                </li>
                                            )
                                        }
                                        if (val === null || val === undefined || val === "")
                                            return null
                                        return (
                                            <li key={field}>
                                                <span className='text-neutral-500'>
                                                    {fieldLabel(it.entityType, field)}:
                                                </span>{" "}
                                                <span className='font-medium text-neutral-800'>
                                                    {formatValue(val)}
                                                </span>
                                            </li>
                                        )
                                    })}
                                </ul>
                            )}
                        </li>
                    )
                })}
            </ul>
        </div>
    )
}
