"use client"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useConfirm, useToast } from "@/components/crm/ui"
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
        email: initial.email ?? "",
        birthDate: toIsoDate(initial.birthDate),
        position: initial.position ?? "",
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
            description: `${form.firstName} ${form.lastName}`.trim() || form.email || form.phone || undefined,
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
            <section className='rounded-xl border border-brand_soft/40 bg-white/70 p-4 sm:p-5'>
                <h2 className='mb-3 text-sm font-semibold uppercase tracking-wide text-night_green/70'>
                    Контакт
                </h2>
                <div className='grid gap-3 sm:grid-cols-2'>
                    <Field label='Имя' value={form.firstName} onChange={update("firstName")} />
                    <Field label='Фамилия' value={form.lastName} onChange={update("lastName")} />
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
                    <Field label='Должность' value={form.position} onChange={update("position")} />
                </div>
            </section>

            <section className='rounded-xl border border-brand_soft/40 bg-white/70 p-4 sm:p-5'>
                <h2 className='mb-3 text-sm font-semibold uppercase tracking-wide text-night_green/70'>
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
                        cpId ? "text-night_green/80" : "text-night_green/40"
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
                    <p className='mt-1 text-xs text-night_green/55'>
                        «Основной» доступен только при привязке к контрагенту.
                    </p>
                )}
            </section>

            {error && <p className='text-sm text-red-600'>{error}</p>}

            <div className='flex flex-wrap items-center justify-between gap-3'>
                <button
                    type='button'
                    onClick={handleDelete}
                    disabled={deleting}
                    className='rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60'
                >
                    {deleting ? "Удаляем..." : "Удалить контакт"}
                </button>
                <div className='flex gap-3'>
                    <button
                        type='button'
                        onClick={() => router.push("/crm/contacts")}
                        className='rounded-lg border border-brand_soft/60 px-4 py-2 text-sm text-night_green/80 hover:bg-brand_soft/30'
                    >
                        К списку
                    </button>
                    <button
                        type='submit'
                        disabled={saving}
                        className='rounded-lg bg-brand_main px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand_main/90 disabled:cursor-not-allowed disabled:opacity-60'
                    >
                        {saving ? "Сохраняем..." : "Сохранить"}
                    </button>
                </div>
            </div>
        </form>
    )
}

function Field({ label, ...props }) {
    return (
        <div>
            <label className='mb-1 block text-xs text-night_green/65'>{label}</label>
            <input
                {...props}
                className='w-full rounded-lg border border-brand_soft/60 px-3 py-2 text-sm shadow-sm focus:border-brand_main focus:outline-none'
            />
        </div>
    )
}
