"use client"
import { useCallback, useEffect, useState } from "react"

function fullName(c) {
    return (
        `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() ||
        c.email ||
        c.phone ||
        "Без имени"
    )
}

export default function ProjectContactsPicker({
    counterpartyId,
    counterpartyName,
    selectedIds,
    onChange,
}) {
    const [contacts, setContacts] = useState([])
    const [loading, setLoading] = useState(false)
    const [showAdd, setShowAdd] = useState(false)
    const [form, setForm] = useState({
        firstName: "",
        lastName: "",
        phone: "",
        email: "",
        position: "",
    })
    const [error, setError] = useState("")
    const [saving, setSaving] = useState(false)

    const load = useCallback(async () => {
        if (!counterpartyId) {
            setContacts([])
            return
        }
        setLoading(true)
        const res = await fetch(`/api/crm/counterparties/${counterpartyId}`)
        if (res.ok) {
            const data = await res.json()
            setContacts(data.item.contacts || [])
        } else {
            setContacts([])
        }
        setLoading(false)
    }, [counterpartyId])

    useEffect(() => {
        load()
        setShowAdd(false)
        setError("")
    }, [load])

    function toggle(id) {
        const set = new Set(selectedIds)
        if (set.has(id)) set.delete(id)
        else set.add(id)
        onChange(Array.from(set))
    }

    function update(field) {
        return e => setForm(prev => ({ ...prev, [field]: e.target.value }))
    }

    async function handleAdd() {
        setError("")
        setSaving(true)
        const res = await fetch(`/api/crm/counterparties/${counterpartyId}/contacts`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
        })
        if (!res.ok) {
            const d = await res.json().catch(() => ({}))
            setError(d.error || "Не удалось создать контакт")
            setSaving(false)
            return
        }
        const data = await res.json()
        const newId = data.item.id
        setContacts(prev => [...prev, data.item])
        onChange([...selectedIds, newId])
        setForm({ firstName: "", lastName: "", phone: "", email: "", position: "" })
        setShowAdd(false)
        setSaving(false)
    }

    if (!counterpartyId) {
        return (
            <div className='rounded-lg border border-dashed border-brand_soft/60 p-3 text-sm text-gray-400'>
                Сначала выберите компанию
            </div>
        )
    }

    return (
        <div className='space-y-3'>
            <div className='flex items-center justify-between'>
                <p className='text-sm font-medium text-night_green'>
                    {counterpartyName || "Контакты"}
                </p>
                {!showAdd && (
                    <button
                        type='button'
                        onClick={() => setShowAdd(true)}
                        className='text-xs text-primary_green hover:text-contrast_green'
                    >
                        + Новый контакт
                    </button>
                )}
            </div>

            {loading ? (
                <p className='text-sm text-gray-400'>Загрузка...</p>
            ) : contacts.length === 0 && !showAdd ? (
                <p className='text-sm text-gray-400'>У компании пока нет контактов.</p>
            ) : (
                <ul className='space-y-1.5'>
                    {contacts.map(c => (
                        <li
                            key={c.id}
                            className='flex items-start gap-2 rounded-md border border-brand_soft/30 px-3 py-2'
                        >
                            <input
                                type='checkbox'
                                className='mt-0.5'
                                checked={selectedIds.includes(c.id)}
                                onChange={() => toggle(c.id)}
                            />
                            <div className='flex-1 text-sm'>
                                <p className='font-medium text-night_green'>{fullName(c)}</p>
                                <p className='text-xs text-gray-600'>
                                    {[c.position, c.phone, c.email].filter(Boolean).join(" · ")}
                                </p>
                            </div>
                            {c.isPrimary && (
                                <span className='rounded-full bg-light_green/30 px-2 py-0.5 text-[10px] font-medium text-night_green'>
                                    Основной
                                </span>
                            )}
                        </li>
                    ))}
                </ul>
            )}

            {showAdd && (
                /* НЕ <form>: пикер живёт внутри формы проекта, а вложенные формы
                   в HTML запрещены — браузер выбрасывает внутренний тег при SSR,
                   и submit уходил во внешнюю форму. */
                <div className='space-y-2 rounded-lg border border-dashed border-primary_green/40 p-3'>
                    <div className='grid gap-2 sm:grid-cols-2'>
                        <Field label='Имя' value={form.firstName} onChange={update("firstName")} />
                        <Field
                            label='Фамилия'
                            value={form.lastName}
                            onChange={update("lastName")}
                        />
                        <Field label='Телефон' value={form.phone} onChange={update("phone")} />
                        <Field
                            label='Email'
                            type='email'
                            value={form.email}
                            onChange={update("email")}
                        />
                        <Field
                            label='Должность'
                            value={form.position}
                            onChange={update("position")}
                            className='sm:col-span-2'
                        />
                    </div>
                    {error && <p className='text-xs text-red-600'>{error}</p>}
                    <div className='flex justify-end gap-2'>
                        <button
                            type='button'
                            onClick={() => {
                                setShowAdd(false)
                                setError("")
                            }}
                            className='rounded-md border border-brand_soft/60 px-3 py-1 text-xs text-gray-700 hover:bg-brand_soft/30'
                        >
                            Отмена
                        </button>
                        <button
                            type='button'
                            onClick={handleAdd}
                            disabled={saving}
                            className='rounded-md bg-brand_main px-3 py-1 text-xs font-semibold text-white hover:bg-brand_main/90 disabled:opacity-60'
                        >
                            {saving ? "Сохраняем..." : "Добавить"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

function Field({ label, className = "", ...props }) {
    return (
        <div className={className}>
            <label className='mb-0.5 block text-[11px] text-gray-600'>{label}</label>
            <input
                {...props}
                className='w-full rounded-md border border-brand_soft/60 px-2 py-1.5 text-sm shadow-sm focus:border-brand_main focus:outline-none'
            />
        </div>
    )
}
