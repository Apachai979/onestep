"use client"
import { useEffect, useMemo, useState } from "react"
import { TASK_RELATION_KINDS, TASK_RELATION_LABELS, TASK_TYPES } from "@/lib/crm/task"
import { crmToday } from "@/lib/crm/datetime"
import { notifyTasksChanged } from "@/lib/crm/tasks-events"
import { dealDisplayTitle } from "@/lib/crm/deal"
import SearchableSelect from "./SearchableSelect"
import TaskTypeIcon from "./TaskTypeIcon"
import TaskScheduleFields, {
    defaultSchedule,
    needsAdvanced,
    scheduleFromTask,
} from "./TaskScheduleFields"
import { Button } from "@/components/crm/ui"

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
        if (initial) {
            return {
                title: initial.title ?? "",
                description: initial.description ?? "",
                type: initial.type ?? TASK_TYPES[0].key,
                assigneeId: initial.assigneeId ?? currentUserId ?? "",
                ...scheduleFromTask(initial),
            }
        }
        const base = {
            title: "",
            description: "",
            type: TASK_TYPES[0].key,
            assigneeId: currentUserId || "",
            ...defaultSchedule(),
        }
        // Клик по конкретному часу в календаре — это слот встречи, час длиной.
        if (defaultStart?.date) {
            if (defaultStart.hour !== undefined && defaultStart.hour !== null) {
                const hh = String(defaultStart.hour).padStart(2, "0")
                const endHour = String(Math.min(defaultStart.hour + 1, 23)).padStart(2, "0")
                base.allDay = false
                base.startAt = `${defaultStart.date}T${hh}:00`
                base.endAt = `${defaultStart.date}T${endHour}:00`
            } else {
                base.startAt = defaultStart.date
                base.endAt = defaultStart.date
            }
        } else if (fixedRelation?.startAt) {
            base.startAt = fixedRelation.startAt
            base.endAt = fixedRelation.startAt
        }
        return base
    })

    const [advanced, setAdvanced] = useState(() => needsAdvanced(form))

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
                label: dealDisplayTitle(d, d.counterparty?.name),
                sublabel: d.counterparty?.name,
                search: `${dealDisplayTitle(d, d.counterparty?.name)} ${d.counterparty?.name ?? ""}`,
            }))
        }
        if (relation.kind === "project") {
            return refs.projects.map(p => ({
                id: p.id,
                label: p.internalName,
                search: p.internalName ?? "",
            }))
        }
        if (relation.kind === "distributor") {
            // Уже выбранного контрагента показываем всегда: он мог сменить тип
            // после того, как задачу создали.
            return refs.counterparties
                .filter(c => c.type === "DISTRIBUTOR" || c.id === relation.id)
                .map(c => ({
                    id: c.id,
                    label: c.name,
                    sublabel: c.inn ? `ИНН ${c.inn}` : c.region,
                    search: `${c.name} ${c.inn ?? ""} ${c.region ?? ""}`,
                }))
        }
        if (relation.kind === "endCustomer") {
            return refs.counterparties
                .filter(c => c.type === "END_CUSTOMER" || c.id === relation.id)
                .map(c => ({
                    id: c.id,
                    label: c.name,
                    sublabel: c.inn ? `ИНН ${c.inn}` : c.region,
                    search: `${c.name} ${c.inn ?? ""} ${c.region ?? ""}`,
                }))
        }
        return []
    }, [relation.kind, relation.id, refs])

    function update(field) {
        return e => setForm(prev => ({ ...prev, [field]: e.target.value }))
    }

    async function handleSubmit(e) {
        e.preventDefault()
        setError("")
        setLoading(true)

        const payload = {
            ...form,
            startAt: form.startAt || crmToday(),
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
        "w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm transition-all duration-200 placeholder:text-neutral-400 focus:border-brand_main focus:outline-none focus:ring-2 focus:ring-brand_main/20"
    const labelClass = "mb-1.5 block text-xs font-medium text-neutral-500"

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
                    <div className='mt-2 flex items-center gap-2 text-xs text-neutral-500'>
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

            <TaskScheduleFields
                value={{ allDay: form.allDay, startAt: form.startAt, endAt: form.endAt }}
                onChange={next => setForm(prev => ({ ...prev, ...next }))}
                advanced={advanced}
                onAdvancedChange={setAdvanced}
            />

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

            {error && (
                <p className='rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700'>
                    {error}
                </p>
            )}

            <div className='flex justify-end gap-2'>
                {onCancel && (
                    <Button type='button' variant='secondary' onClick={onCancel}>
                        Отмена
                    </Button>
                )}
                <Button type='submit' loading={loading}>
                    {isEdit ? "Сохранить" : "Создать"}
                </Button>
            </div>
        </form>
    )
}
