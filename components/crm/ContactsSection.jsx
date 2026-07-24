"use client"
import { useRouter } from "next/navigation"
import { useState } from "react"
import {
    LuPencil,
    LuTrash2,
    LuSmartphone,
    LuPhone,
    LuMail,
    LuCake,
} from "react-icons/lu"
import { useConfirm, useToast } from "@/components/crm/ui"
import PhoneLink from "./PhoneLink"
import SearchableSelect from "./SearchableSelect"

const EMPTY = {
    firstName: "",
    lastName: "",
    phone: "",
    workPhone: "",
    email: "",
    birthDate: "",
    position: "",
    comment: "",
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
            workPhone: contact.workPhone ?? "",
            email: contact.email ?? "",
            birthDate: toIsoDate(contact.birthDate),
            position: contact.position ?? "",
            comment: contact.comment ?? "",
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
        <section className='rounded-xl border border-line bg-white p-4'>
            <div className='mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                <h2 className='text-xs font-semibold uppercase tracking-wide text-neutral-500'>
                    Контакты
                </h2>
                {!formOpen && !showAttach && (
                    <div className='flex flex-col gap-2 sm:flex-row sm:flex-wrap'>
                        <button
                            type='button'
                            onClick={startAttach}
                            className='rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-surface_muted'
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
                <div className='mb-4 space-y-3 rounded-lg border border-dashed border-brand_main/40 bg-surface_muted p-4'>
                    <p className='text-xs font-semibold uppercase tracking-wide text-neutral-500'>
                        Прикрепить контакт
                    </p>
                    {freeContacts === null ? (
                        <p className='text-sm text-neutral-400'>Загрузка...</p>
                    ) : freeContacts.length === 0 ? (
                        <p className='text-sm text-neutral-400'>
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
                            className='rounded-lg border border-line px-3 py-1.5 text-sm text-neutral-700 hover:bg-surface_muted'
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
                <p className='text-sm text-neutral-400'>Контактов пока нет.</p>
            )}

            <ul className='space-y-2'>
                {contacts.map(c => (
                    <li
                        key={c.id}
                        className='flex items-start justify-between gap-3 rounded-lg border border-line px-3 py-2.5'
                    >
                        <div className='min-w-0 flex-1'>
                            <div className='flex flex-wrap items-center gap-x-2 gap-y-1'>
                                <span className='font-medium text-neutral-900'>
                                    {fullName(c) || "Без имени"}
                                </span>
                                {c.isPrimary && (
                                    <span className='rounded-full bg-brand_main/10 px-1.5 py-0.5 text-[10px] font-medium text-brand_main'>
                                        Основной
                                    </span>
                                )}
                                {c.position && (
                                    <span className='text-xs text-neutral-400'>· {c.position}</span>
                                )}
                            </div>
                            <div className='mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-600'>
                                {c.phone && (
                                    <span className='inline-flex items-center gap-1'>
                                        <LuSmartphone className='h-3 w-3 text-neutral-400' />
                                        <PhoneLink phone={c.phone} />
                                    </span>
                                )}
                                {c.workPhone && (
                                    <span className='inline-flex items-center gap-1'>
                                        <LuPhone className='h-3 w-3 text-neutral-400' />
                                        <PhoneLink phone={c.workPhone} />
                                    </span>
                                )}
                                {c.email && (
                                    <span className='inline-flex items-center gap-1'>
                                        <LuMail className='h-3 w-3 text-neutral-400' />
                                        <a
                                            href={`mailto:${c.email}`}
                                            className='hover:text-brand_main'
                                        >
                                            {c.email}
                                        </a>
                                    </span>
                                )}
                                {c.birthDate && (
                                    <span className='inline-flex items-center gap-1'>
                                        <LuCake className='h-3 w-3 text-neutral-400' />
                                        {new Date(c.birthDate).toLocaleDateString("ru-RU")}
                                    </span>
                                )}
                            </div>
                            {c.comment && (
                                <p className='mt-1 whitespace-pre-wrap text-xs text-neutral-500'>
                                    {c.comment}
                                </p>
                            )}
                        </div>
                        <div className='flex shrink-0 gap-1 self-center'>
                            <button
                                type='button'
                                onClick={() => startEdit(c)}
                                title='Изменить'
                                aria-label='Изменить контакт'
                                className='rounded-md border border-line p-1.5 text-neutral-500 transition hover:bg-surface_muted hover:text-neutral-900'
                            >
                                <LuPencil className='h-3.5 w-3.5' />
                            </button>
                            <button
                                type='button'
                                onClick={() => handleDelete(c.id)}
                                title='Удалить'
                                aria-label='Удалить контакт'
                                className='rounded-md border border-red-200 p-1.5 text-red-500 transition hover:bg-red-50'
                            >
                                <LuTrash2 className='h-3.5 w-3.5' />
                            </button>
                        </div>
                    </li>
                ))}
            </ul>

            {formOpen && (
                <form
                    onSubmit={handleSubmit}
                    className='mt-4 space-y-3 rounded-lg border border-dashed border-brand_main/40 bg-surface_muted p-4'
                >
                    <div className='grid gap-3 sm:grid-cols-2'>
                        <Field label='Имя' value={form.firstName} onChange={update("firstName")} />
                        <Field
                            label='Фамилия'
                            value={form.lastName}
                            onChange={update("lastName")}
                        />
                        <Field
                            label='Сотовый телефон'
                            placeholder='+79999999999'
                            value={form.phone}
                            onChange={update("phone")}
                        />
                        <Field
                            label='Рабочий телефон'
                            value={form.workPhone}
                            onChange={update("workPhone")}
                        />
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
                    <div>
                        <label className='mb-1 block text-xs font-medium text-neutral-500'>
                            Комментарий
                        </label>
                        <textarea
                            value={form.comment}
                            onChange={update("comment")}
                            rows={3}
                            className='w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm transition-all duration-200 placeholder:text-neutral-400 focus:border-brand_main focus:outline-none focus:ring-2 focus:ring-brand_main/20'
                        />
                    </div>
                    <label className='flex items-center gap-2 text-sm text-neutral-700'>
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
                            className='rounded-lg border border-line px-3 py-1.5 text-sm text-neutral-700 hover:bg-surface_muted'
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
            <label className='mb-1 block text-xs font-medium text-neutral-500'>{label}</label>
            <input
                {...props}
                className='h-10 w-full rounded-xl border border-line bg-white px-3 text-sm text-neutral-900 shadow-sm transition-all duration-200 placeholder:text-neutral-400 focus:border-brand_main focus:outline-none focus:ring-2 focus:ring-brand_main/20'
            />
        </div>
    )
}
