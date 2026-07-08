"use client"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useConfirm, useToast } from "@/components/crm/ui"
import SearchableSelect from "./SearchableSelect"

const EMPTY = {
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    birthDate: "",
    position: "",
    isPrimary: false,
}

function toIsoDate(value) {
    if (!value) return ""
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return ""
    return d.toISOString().slice(0, 10)
}

function fullName(c) {
    return `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim()
}

export default function ContactsSection({ counterpartyId, initialContacts }) {
    const router = useRouter()
    const toast = useToast()
    const confirm = useConfirm()
    const [contacts, setContacts] = useState(initialContacts)
    const [editingId, setEditingId] = useState(null)
    const [showAdd, setShowAdd] = useState(false)
    const [form, setForm] = useState(EMPTY)
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)
    // Прикрепление существующего контакта без привязки к контрагенту.
    const [showAttach, setShowAttach] = useState(false)
    const [freeContacts, setFreeContacts] = useState(null)
    const [attachId, setAttachId] = useState("")
    const [attaching, setAttaching] = useState(false)

    function startAdd() {
        setForm(EMPTY)
        setEditingId(null)
        setError("")
        setShowAdd(true)
        setShowAttach(false)
    }

    async function startAttach() {
        setShowAttach(true)
        setShowAdd(false)
        setEditingId(null)
        setAttachId("")
        // свободные контакты — без привязки к контрагенту
        const r = await fetch("/api/crm/contacts")
        if (r.ok) {
            const d = await r.json()
            setFreeContacts((d.items || []).filter(c => !c.counterparty))
        } else {
            setFreeContacts([])
        }
    }

    async function handleAttach() {
        if (!attachId) return
        setAttaching(true)
        const res = await fetch(`/api/crm/contacts/${attachId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ counterpartyId }),
        })
        if (!res.ok) {
            const data = await res.json().catch(() => ({}))
            toast.error(data.error || "Не удалось прикрепить контакт")
            setAttaching(false)
            return
        }
        toast.success("Контакт прикреплён")
        setShowAttach(false)
        setAttaching(false)
        await refresh()
        router.refresh()
    }

    function startEdit(contact) {
        setForm({
            firstName: contact.firstName ?? "",
            lastName: contact.lastName ?? "",
            phone: contact.phone ?? "",
            email: contact.email ?? "",
            birthDate: toIsoDate(contact.birthDate),
            position: contact.position ?? "",
            isPrimary: !!contact.isPrimary,
        })
        setEditingId(contact.id)
        setError("")
        setShowAdd(false)
    }

    function cancelForm() {
        setShowAdd(false)
        setEditingId(null)
        setError("")
    }

    function update(field) {
        return e => {
            const v = e.target.type === "checkbox" ? e.target.checked : e.target.value
            setForm(prev => ({ ...prev, [field]: v }))
        }
    }

    async function handleSubmit(e) {
        e.preventDefault()
        setError("")
        setLoading(true)

        const url = editingId
            ? `/api/crm/contacts/${editingId}`
            : `/api/crm/counterparties/${counterpartyId}/contacts`
        const method = editingId ? "PATCH" : "POST"

        const res = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
        })

        if (!res.ok) {
            const data = await res.json().catch(() => ({}))
            setError(data.error || "Не удалось сохранить контакт")
            setLoading(false)
            return
        }

        await refresh()
        cancelForm()
        setLoading(false)
        router.refresh()
    }

    async function handleDelete(id) {
        const c = contacts.find(x => x.id === id)
        const fullName = c
            ? `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() || c.email || c.phone || ""
            : ""
        const ok = await confirm({
            title: "Удалить контакт?",
            description: fullName || undefined,
            confirmText: "Удалить",
            variant: "danger",
        })
        if (!ok) return
        const res = await fetch(`/api/crm/contacts/${id}`, { method: "DELETE" })
        if (!res.ok) {
            const data = await res.json().catch(() => ({}))
            toast.error(data.error || "Не удалось удалить")
            return
        }
        toast.success("Контакт удалён")
        await refresh()
        router.refresh()
    }

    async function refresh() {
        const r = await fetch(`/api/crm/counterparties/${counterpartyId}`)
        if (r.ok) {
            const data = await r.json()
            setContacts(data.item.contacts || [])
        }
    }

    const editing = editingId !== null
    const formOpen = showAdd || editing

    return (
        <section className='rounded-xl border border-brand_soft/40 bg-white/70 p-5'>
            <div className='mb-4 flex items-center justify-between'>
                <h2 className='text-sm font-semibold uppercase tracking-wide text-gray-500'>
                    Контакты
                </h2>
                {!formOpen && !showAttach && (
                    <div className='flex flex-wrap gap-2'>
                        <button
                            type='button'
                            onClick={startAttach}
                            className='rounded-lg border border-brand_soft/60 bg-white px-3 py-1.5 text-xs font-medium text-night_green/80 hover:bg-brand_soft/30'
                        >
                            Прикрепить существующий
                        </button>
                        <button
                            type='button'
                            onClick={startAdd}
                            className='rounded-lg bg-brand_main px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-brand_main/90'
                        >
                            Добавить контакт
                        </button>
                    </div>
                )}
            </div>

            {showAttach && (
                <div className='mb-4 space-y-3 rounded-lg border border-dashed border-primary_green/40 p-4'>
                    <p className='text-xs font-semibold uppercase tracking-wide text-night_green/70'>
                        Прикрепить контакт
                    </p>
                    {freeContacts === null ? (
                        <p className='text-sm text-gray-400'>Загрузка...</p>
                    ) : freeContacts.length === 0 ? (
                        <p className='text-sm text-gray-400'>
                            Свободных контактов нет — все контакты уже привязаны к контрагентам.
                        </p>
                    ) : (
                        <SearchableSelect
                            value={attachId}
                            onChange={setAttachId}
                            placeholder='Выберите контакт'
                            emptyLabel='Контакт не найден'
                            options={freeContacts.map(c => ({
                                id: c.id,
                                label:
                                    `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() ||
                                    c.email ||
                                    c.phone ||
                                    "Без имени",
                                sublabel: [c.position, c.phone, c.email]
                                    .filter(Boolean)
                                    .join(" · "),
                                search: `${c.firstName ?? ""} ${c.lastName ?? ""} ${c.phone ?? ""} ${c.email ?? ""}`,
                            }))}
                        />
                    )}
                    <div className='flex justify-end gap-2'>
                        <button
                            type='button'
                            onClick={() => setShowAttach(false)}
                            className='rounded-lg border border-brand_soft/60 px-3 py-1.5 text-sm text-gray-700 hover:bg-brand_soft/30'
                        >
                            Отмена
                        </button>
                        <button
                            type='button'
                            onClick={handleAttach}
                            disabled={!attachId || attaching}
                            className='rounded-lg bg-brand_main px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand_main/90 disabled:cursor-not-allowed disabled:opacity-60'
                        >
                            {attaching ? "Прикрепляем..." : "Прикрепить"}
                        </button>
                    </div>
                </div>
            )}

            {contacts.length === 0 && !formOpen && (
                <p className='text-sm text-gray-400'>Контактов пока нет.</p>
            )}

            <ul className='space-y-3'>
                {contacts.map(c => (
                    <li
                        key={c.id}
                        className='flex flex-col gap-2 rounded-lg border border-brand_soft/30 p-3 sm:flex-row sm:items-start sm:justify-between'
                    >
                        <div className='flex-1'>
                            <div className='flex flex-wrap items-center gap-2'>
                                <span className='font-medium text-night_green'>
                                    {fullName(c) || "Без имени"}
                                </span>
                                {c.isPrimary && (
                                    <span className='rounded-full bg-light_green/30 px-2 py-0.5 text-xs font-medium text-night_green'>
                                        Основной
                                    </span>
                                )}
                            </div>
                            {c.position && <p className='text-sm text-gray-600'>{c.position}</p>}
                            <div className='mt-1 grid gap-1 text-sm text-gray-700 sm:grid-cols-2'>
                                {c.phone && <span>Тел.: {c.phone}</span>}
                                {c.email && <span>{c.email}</span>}
                                {c.birthDate && (
                                    <span>
                                        Д/р: {new Date(c.birthDate).toLocaleDateString("ru-RU")}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className='flex gap-2'>
                            <button
                                type='button'
                                onClick={() => startEdit(c)}
                                className='rounded-md border border-brand_soft/60 px-3 py-1 text-xs text-gray-700 hover:bg-brand_soft/30'
                            >
                                Изменить
                            </button>
                            <button
                                type='button'
                                onClick={() => handleDelete(c.id)}
                                className='rounded-md border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50'
                            >
                                Удалить
                            </button>
                        </div>
                    </li>
                ))}
            </ul>

            {formOpen && (
                <form
                    onSubmit={handleSubmit}
                    className='mt-4 space-y-3 rounded-lg border border-dashed border-primary_green/40 p-4'
                >
                    <div className='grid gap-3 sm:grid-cols-2'>
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
                            label='Дата рождения'
                            type='date'
                            value={form.birthDate}
                            onChange={update("birthDate")}
                        />
                        <Field
                            label='Должность'
                            value={form.position}
                            onChange={update("position")}
                        />
                    </div>
                    <label className='flex items-center gap-2 text-sm text-gray-700'>
                        <input
                            type='checkbox'
                            checked={form.isPrimary}
                            onChange={update("isPrimary")}
                        />
                        Основной контакт компании
                    </label>
                    {error && <p className='text-sm text-red-600'>{error}</p>}
                    <div className='flex justify-end gap-2'>
                        <button
                            type='button'
                            onClick={cancelForm}
                            className='rounded-lg border border-brand_soft/60 px-3 py-1.5 text-sm text-gray-700 hover:bg-brand_soft/30'
                        >
                            Отмена
                        </button>
                        <button
                            type='submit'
                            disabled={loading}
                            className='rounded-lg bg-brand_main px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand_main/90 disabled:cursor-not-allowed disabled:opacity-60'
                        >
                            {loading ? "Сохраняем..." : editingId ? "Сохранить" : "Добавить"}
                        </button>
                    </div>
                </form>
            )}
        </section>
    )
}

function Field({ label, ...props }) {
    return (
        <div>
            <label className='mb-1 block text-xs text-gray-600'>{label}</label>
            <input
                {...props}
                className='w-full rounded-lg border border-brand_soft/60 px-3 py-2 text-sm shadow-sm focus:border-brand_main focus:outline-none'
            />
        </div>
    )
}
