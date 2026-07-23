"use client"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Button, useConfirm, useToast } from "@/components/crm/ui"
import SearchableSelect from "./SearchableSelect"

const TYPE_LABELS = {
    DISTRIBUTOR: "Дистрибьютор",
    END_CUSTOMER: "Конечный потребитель",
}

function toIsoDate(value) {
    if (!value) return ""
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return ""
    return d.toISOString().slice(0, 10)
}

export default function ContactEditForm({ initial }) {
    const router = useRouter()
    const toast = useToast()
    const confirm = useConfirm()

    const [form, setForm] = useState({
        firstName: initial.firstName ?? "",
        lastName: initial.lastName ?? "",
        phone: initial.phone ?? "",
        workPhone: initial.workPhone ?? "",
        email: initial.email ?? "",
        birthDate: toIsoDate(initial.birthDate),
        position: initial.position ?? "",
        comment: initial.comment ?? "",
        isPrimary: !!initial.isPrimary,
    })
    const [cpId, setCpId] = useState(initial.counterpartyId ?? "")
    const [counterparties, setCounterparties] = useState([])
    const [error, setError] = useState("")
    const [saving, setSaving] = useState(false)
    const [deleting, setDeleting] = useState(false)

    useEffect(() => {
        fetch("/api/crm/counterparties")
            .then(r => r.json())
            .then(d => setCounterparties(d.items || []))
            .catch(() => {})
    }, [])

    function update(field) {
        return e => {
            const v = e.target.type === "checkbox" ? e.target.checked : e.target.value
            setForm(prev => ({ ...prev, [field]: v }))
        }
    }

    async function handleSave(e) {
        e.preventDefault()
        setError("")
        setSaving(true)
        const res = await fetch(`/api/crm/contacts/${initial.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...form, counterpartyId: cpId || null }),
        })
        if (!res.ok) {
            const data = await res.json().catch(() => ({}))
            setError(data.error || "Не удалось сохранить")
            setSaving(false)
            return
        }
        setSaving(false)
        toast.success("Контакт сохранён")
        router.refresh()
    }

    async function handleDelete() {
        const ok = await confirm({
            title: "Удалить контакт?",
            description:
                `${form.firstName} ${form.lastName}`.trim() ||
                form.email ||
                form.phone ||
                undefined,
            confirmText: "Удалить",
            variant: "danger",
        })
        if (!ok) return
        setDeleting(true)
        const res = await fetch(`/api/crm/contacts/${initial.id}`, { method: "DELETE" })
        if (!res.ok) {
            const data = await res.json().catch(() => ({}))
            toast.error(data.error || "Не удалось удалить")
            setDeleting(false)
            return
        }
        toast.success("Контакт удалён")
        router.push("/crm/contacts")
        router.refresh()
    }

    const cpOptions = counterparties.map(c => ({
        id: c.id,
        label: c.name,
        sublabel: `${TYPE_LABELS[c.type] || c.type}${c.region ? ` · ${c.region}` : ""}${
            c.inn ? ` · ИНН ${c.inn}` : ""
        }`,
        search: `${c.name} ${c.inn ?? ""} ${c.region ?? ""}`,
    }))

    return (
        <form onSubmit={handleSave} className='space-y-4'>
            <section className='rounded-2xl border border-line bg-white p-6 shadow-sm'>
                <h2 className='mb-4 text-sm font-semibold text-neutral-900'>Контакт</h2>
                <div className='grid gap-3 sm:grid-cols-2'>
                    <Field label='Имя' value={form.firstName} onChange={update("firstName")} />
                    <Field label='Фамилия' value={form.lastName} onChange={update("lastName")} />
                    <Field
                        label='Сотовый телефон *'
                        required
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
                    <Field label='Должность' value={form.position} onChange={update("position")} />
                </div>
                <div className='mt-3'>
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
            </section>

            <section className='rounded-2xl border border-line bg-white p-6 shadow-sm'>
                <h2 className='mb-4 text-sm font-semibold text-neutral-900'>
                    Привязка к контрагенту
                </h2>
                <SearchableSelect
                    value={cpId}
                    onChange={setCpId}
                    placeholder='— Без привязки —'
                    emptyLabel='Контрагент не найден'
                    options={cpOptions}
                />
                <label
                    className={`mt-3 flex items-center gap-2 text-sm ${
                        cpId ? "text-neutral-700" : "text-neutral-400"
                    }`}
                >
                    <input
                        type='checkbox'
                        checked={form.isPrimary && !!cpId}
                        disabled={!cpId}
                        onChange={update("isPrimary")}
                    />
                    Основной контакт контрагента
                </label>
                {!cpId && (
                    <p className='mt-1 text-xs text-neutral-400'>
                        «Основной» доступен только при привязке к контрагенту.
                    </p>
                )}
            </section>

            {error && (
                <p className='rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700'>
                    {error}
                </p>
            )}

            <div className='flex flex-wrap items-center justify-between gap-3'>
                <Button
                    type='button'
                    variant='danger_soft'
                    onClick={handleDelete}
                    loading={deleting}
                >
                    Удалить контакт
                </Button>
                <div className='flex gap-3'>
                    <Button
                        type='button'
                        variant='secondary'
                        onClick={() => router.push("/crm/contacts")}
                    >
                        К списку
                    </Button>
                    <Button type='submit' loading={saving}>
                        Сохранить
                    </Button>
                </div>
            </div>
        </form>
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
