"use client"
import { useEffect, useMemo, useState } from "react"
import { TASK_RELATION_KINDS, TASK_RELATION_LABELS, TASK_TYPES } from "@/lib/crm/task"
import { notifyTasksChanged } from "@/lib/crm/tasks-events"
import SearchableSelect from "./SearchableSelect"
import TaskTypeIcon from "./TaskTypeIcon"

const todayIso = () => new Date().toISOString().slice(0, 10)
const todayDateTime = () => {
    const d = new Date()
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    return d.toISOString().slice(0, 16)
}

function dateOnly(v) {
    if (!v) return ""
    return String(v).slice(0, 10)
}

function timeOnly(v) {
    if (!v) return ""
    const s = String(v)
    if (s.length >= 16 && s.includes("T")) return s.slice(11, 16)
    return ""
}

function composeDateTime(date, time) {
    if (!date) return ""
    return `${date}T${time || "00:00"}`
}

function safeJson(text) {
    try {
        return JSON.parse(text)
    } catch {
        return null
    }
}

function managerName(u) {
    return `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email
}

export default function TaskForm({
    initial,
    fixedRelation,
    currentUserId,
    onSaved,
    onCancel,
    compact = false,
    defaultStart,
}) {
    const isEdit = !!initial?.id

    const [form, setForm] = useState(() => {
        const base = {
            title: "",
            description: "",
            type: TASK_TYPES[0].key,
            assigneeId: currentUserId || "",
            allDay: true,
            startAt: todayIso(),
            endAt: todayIso(),
        }
        if (defaultStart?.date && !initial) {
            if (defaultStart.hour !== undefined && defaultStart.hour !== null) {
                base.allDay = false
                const startTime = `${defaultStart.date}T${String(defaultStart.hour).padStart(2, "0")}:00`
                const endHour = Math.min(defaultStart.hour + 1, 23)
                const endTime = `${defaultStart.date}T${String(endHour).padStart(2, "0")}:00`
                base.startAt = startTime
                base.endAt = endTime
            } else {
                base.startAt = defaultStart.date
                base.endAt = defaultStart.date
            }
        }
        if (initial) {
            const startAtIso = initial.startAt
                ? new Date(initial.startAt).toISOString()
                : null
            const endAtIso = initial.endAt
                ? new Date(initial.endAt).toISOString()
                : null
            return {
                title: initial.title ?? "",
                description: initial.description ?? "",
                type: initial.type ?? TASK_TYPES[0].key,
                assigneeId: initial.assigneeId ?? currentUserId ?? "",
                allDay: initial.allDay ?? true,
                startAt: initial.allDay
                    ? startAtIso?.slice(0, 10) || todayIso()
                    : startAtIso?.slice(0, 16) || todayDateTime(),
                endAt: initial.allDay
                    ? endAtIso?.slice(0, 10) || todayIso()
                    : endAtIso?.slice(0, 16) || todayDateTime(),
            }
        }
        if (fixedRelation?.startAt) {
            base.startAt = fixedRelation.startAt
            base.endAt = fixedRelation.startAt
        }
        return base
    })

    const [relation, setRelation] = useState(() => {
        if (fixedRelation?.kind) return { kind: fixedRelation.kind, id: fixedRelation.id }
        if (initial) {
            for (const k of TASK_RELATION_KINDS) {
                if (initial[`${k}Id`]) return { kind: k, id: initial[`${k}Id`] }
            }
        }
        return { kind: "", id: "" }
    })

    const [refs, setRefs] = useState({ users: [], deals: [], projects: [], counterparties: [] })
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        Promise.all([
            fetch("/api/crm/users").then(r => r.json()),
            fetch("/api/crm/deals").then(r => r.json()),
            fetch("/api/crm/projects").then(r => r.json()),
            fetch("/api/crm/counterparties").then(r => r.json()),
        ])
            .then(([u, d, p, c]) =>
                setRefs({
                    users: u.items || [],
                    deals: d.items || [],
                    projects: p.items || [],
                    counterparties: c.items || [],
                }),
            )
            .catch(() => {})
    }, [])

    const assigneeOptions = useMemo(
        () =>
            refs.users.map(u => ({
                id: u.id,
                label: managerName(u),
                search: `${u.firstName ?? ""} ${u.lastName ?? ""} ${u.email ?? ""}`,
            })),
        [refs.users],
    )

    const relationOptions = useMemo(() => {
        if (relation.kind === "deal") {
            return refs.deals.map(d => ({
                id: d.id,
                label: d.title || `Сделка с ${d.counterparty?.name || "клиентом"}`,
                sublabel: d.counterparty?.name,
                search: `${d.title ?? ""} ${d.counterparty?.name ?? ""}`,
            }))
        }
        if (relation.kind === "project") {
            return refs.projects.map(p => ({
                id: p.id,
                label: p.internalName || p.externalAuctionId,
                sublabel: p.externalAuctionId,
                search: `${p.internalName ?? ""} ${p.externalAuctionId ?? ""}`,
            }))
        }
        if (relation.kind === "distributor") {
            return refs.counterparties
                .filter(c => c.type === "DISTRIBUTOR")
                .map(c => ({
                    id: c.id,
                    label: c.name,
                    sublabel: c.inn ? `ИНН ${c.inn}` : c.region,
                    search: `${c.name} ${c.inn ?? ""} ${c.region ?? ""}`,
                }))
        }
        if (relation.kind === "endCustomer") {
            return refs.counterparties
                .filter(c => c.type === "END_CUSTOMER")
                .map(c => ({
                    id: c.id,
                    label: c.name,
                    sublabel: c.inn ? `ИНН ${c.inn}` : c.region,
                    search: `${c.name} ${c.inn ?? ""} ${c.region ?? ""}`,
                }))
        }
        return []
    }, [relation.kind, refs])

    function update(field) {
        return e => setForm(prev => ({ ...prev, [field]: e.target.value }))
    }

    function onAllDayChange(e) {
        const allDay = e.target.checked
        setForm(prev => {
            const next = { ...prev, allDay }
            if (allDay) {
                next.startAt = (prev.startAt || todayIso()).slice(0, 10)
                next.endAt = (prev.endAt || prev.startAt || todayIso()).slice(0, 10)
            } else {
                const t = todayDateTime()
                next.startAt = (prev.startAt || "").length === 10 ? `${prev.startAt}T09:00` : prev.startAt || t
                next.endAt = (prev.endAt || "").length === 10 ? `${prev.endAt}T10:00` : prev.endAt || t
            }
            return next
        })
    }

    async function handleSubmit(e) {
        e.preventDefault()
        setError("")
        setLoading(true)

        const payload = {
            ...form,
            startAt: form.startAt,
            endAt: form.endAt || form.startAt,
            dealId: null,
            projectId: null,
            distributorId: null,
            endCustomerId: null,
        }
        if (relation.kind && relation.id) {
            payload[`${relation.kind}Id`] = relation.id
        }

        const url = isEdit ? `/api/crm/tasks/${initial.id}` : "/api/crm/tasks"
        const method = isEdit ? "PATCH" : "POST"

        const res = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        })
        const text = await res.text()
        const data = text ? safeJson(text) : {}
        setLoading(false)

        if (!res.ok) {
            setError(data?.error || "Не удалось сохранить")
            return
        }
        notifyTasksChanged()
        if (onSaved) onSaved(data.item)
    }

    const fieldClass =
        "w-full rounded-lg border border-brand_soft/60 px-3 py-2 text-sm shadow-sm focus:border-brand_main focus:outline-none"
    const labelClass = "mb-1 block text-xs text-gray-600"

    return (
        <form onSubmit={handleSubmit} className={`space-y-4 ${compact ? "" : "max-w-3xl"}`}>
            <div>
                <label className={labelClass}>Заголовок *</label>
                <input
                    value={form.title}
                    onChange={update("title")}
                    required
                    className={fieldClass}
                    placeholder='Что нужно сделать'
                />
            </div>

            <div className='grid gap-3 sm:grid-cols-2'>
                <div>
                    <label className={labelClass}>Тип</label>
                    <select value={form.type} onChange={update("type")} className={fieldClass}>
                        {TASK_TYPES.map(t => (
                            <option key={t.key} value={t.key}>
                                {t.label}
                            </option>
                        ))}
                    </select>
                    <div className='mt-2 flex items-center gap-2 text-xs text-gray-600'>
                        <span
                            className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${TASK_TYPES.find(t => t.key === form.type)?.bg}`}
                        >
                            <TaskTypeIcon type={form.type} />
                        </span>
                        <span>Цвет и иконка задачи</span>
                    </div>
                </div>
                <div>
                    <label className={labelClass}>Ответственный *</label>
                    <SearchableSelect
                        value={form.assigneeId}
                        onChange={id => setForm(prev => ({ ...prev, assigneeId: id }))}
                        options={assigneeOptions}
                        required
                        placeholder='Выберите сотрудника'
                    />
                </div>
            </div>

            <div className='space-y-2'>
                <label className='flex items-center gap-2 text-sm text-gray-700'>
                    <input
                        type='checkbox'
                        checked={form.allDay}
                        onChange={onAllDayChange}
                    />
                    Весь день
                </label>
                {form.allDay ? (
                    <div className='grid gap-3 sm:grid-cols-2'>
                        <div>
                            <label className={labelClass}>Дата начала</label>
                            <input
                                type='date'
                                value={form.startAt}
                                onChange={update("startAt")}
                                required
                                className={fieldClass}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Дата окончания</label>
                            <input
                                type='date'
                                value={form.endAt}
                                onChange={update("endAt")}
                                required
                                className={fieldClass}
                            />
                        </div>
                    </div>
                ) : (
                    <div className='grid gap-3 sm:grid-cols-4'>
                        <div>
                            <label className={labelClass}>Дата начала</label>
                            <input
                                type='date'
                                value={dateOnly(form.startAt)}
                                onChange={e =>
                                    setForm(prev => ({
                                        ...prev,
                                        startAt: composeDateTime(
                                            e.target.value,
                                            timeOnly(prev.startAt) || "09:00",
                                        ),
                                        endAt: composeDateTime(
                                            dateOnly(prev.endAt) < e.target.value
                                                ? e.target.value
                                                : dateOnly(prev.endAt),
                                            timeOnly(prev.endAt) || "10:00",
                                        ),
                                    }))
                                }
                                required
                                className={fieldClass}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Время начала</label>
                            <input
                                type='time'
                                value={timeOnly(form.startAt)}
                                onChange={e =>
                                    setForm(prev => ({
                                        ...prev,
                                        startAt: composeDateTime(
                                            dateOnly(prev.startAt),
                                            e.target.value,
                                        ),
                                    }))
                                }
                                required
                                className={fieldClass}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Дата окончания</label>
                            <input
                                type='date'
                                value={dateOnly(form.endAt)}
                                onChange={e =>
                                    setForm(prev => ({
                                        ...prev,
                                        endAt: composeDateTime(
                                            e.target.value,
                                            timeOnly(prev.endAt) || "10:00",
                                        ),
                                    }))
                                }
                                required
                                className={fieldClass}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Время окончания</label>
                            <input
                                type='time'
                                value={timeOnly(form.endAt)}
                                onChange={e =>
                                    setForm(prev => ({
                                        ...prev,
                                        endAt: composeDateTime(
                                            dateOnly(prev.endAt),
                                            e.target.value,
                                        ),
                                    }))
                                }
                                required
                                className={fieldClass}
                            />
                        </div>
                    </div>
                )}
            </div>

            {!fixedRelation && (
                <div className='grid gap-3 sm:grid-cols-2'>
                    <div>
                        <label className={labelClass}>Связь</label>
                        <select
                            value={relation.kind}
                            onChange={e =>
                                setRelation({ kind: e.target.value, id: "" })
                            }
                            className={fieldClass}
                        >
                            <option value=''>Без связи</option>
                            {TASK_RELATION_KINDS.map(k => (
                                <option key={k} value={k}>
                                    {TASK_RELATION_LABELS[k]}
                                </option>
                            ))}
                        </select>
                    </div>
                    {relation.kind && (
                        <div>
                            <label className={labelClass}>
                                {TASK_RELATION_LABELS[relation.kind]}
                            </label>
                            <SearchableSelect
                                value={relation.id}
                                onChange={id => setRelation(prev => ({ ...prev, id }))}
                                options={relationOptions}
                                placeholder='Найти...'
                            />
                        </div>
                    )}
                </div>
            )}

            <div>
                <label className={labelClass}>Описание</label>
                <textarea
                    rows={3}
                    value={form.description}
                    onChange={update("description")}
                    className={fieldClass}
                />
            </div>

            {error && <p className='text-sm text-red-600'>{error}</p>}

            <div className='flex justify-end gap-2'>
                {onCancel && (
                    <button
                        type='button'
                        onClick={onCancel}
                        className='rounded-lg border border-brand_soft/60 px-3 py-1.5 text-sm text-gray-700 hover:bg-brand_soft/30'
                    >
                        Отмена
                    </button>
                )}
                <button
                    type='submit'
                    disabled={loading}
                    className='rounded-lg bg-brand_main px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand_main/90 disabled:cursor-not-allowed disabled:opacity-60'
                >
                    {loading ? "Сохраняем..." : isEdit ? "Сохранить" : "Создать"}
                </button>
            </div>
        </form>
    )
}
