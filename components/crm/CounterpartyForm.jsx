"use client"
import { useRouter } from "next/navigation"
import { useState } from "react"

const EMPTY = {
    name: "",
    region: "",
    inn: "",
    contactPerson: "",
    phone: "",
    email: "",
    address: "",
    note: "",
}

export default function CounterpartyForm({ type, initial, mode = "create" }) {
    const router = useRouter()
    const [form, setForm] = useState(() => ({
        ...EMPTY,
        ...Object.fromEntries(
            Object.entries(initial || {}).map(([k, v]) => [k, v ?? ""]),
        ),
    }))
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)

    function update(field) {
        return e => setForm(prev => ({ ...prev, [field]: e.target.value }))
    }

    async function handleSubmit(e) {
        e.preventDefault()
        setError("")
        setLoading(true)

        const payload = { ...form, type: mode === "create" ? type : undefined }
        const url =
            mode === "create"
                ? "/api/crm/counterparties"
                : `/api/crm/counterparties/${initial.id}`
        const method = mode === "create" ? "POST" : "PATCH"

        const res = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        })

        if (!res.ok) {
            const data = await res.json().catch(() => ({}))
            setError(data.error || "Не удалось сохранить")
            setLoading(false)
            return
        }
        const data = await res.json()
        const id = data.item?.id || initial?.id
        router.push(`/crm/counterparties/${id}`)
        router.refresh()
    }

    return (
        <form onSubmit={handleSubmit} className='space-y-4'>
            <div className='grid gap-4 sm:grid-cols-2'>
                <Field label='Название *' value={form.name} onChange={update("name")} required />
                <Field label='Регион *' value={form.region} onChange={update("region")} required />
                <Field label='ИНН' value={form.inn} onChange={update("inn")} />
                <Field
                    label='Контактное лицо'
                    value={form.contactPerson}
                    onChange={update("contactPerson")}
                />
                <Field label='Телефон' value={form.phone} onChange={update("phone")} />
                <Field
                    label='Email'
                    type='email'
                    value={form.email}
                    onChange={update("email")}
                />
                <Field
                    label='Адрес'
                    value={form.address}
                    onChange={update("address")}
                    className='sm:col-span-2'
                />
            </div>
            <div>
                <label className='mb-1 block text-sm text-gray-700'>Примечание</label>
                <textarea
                    rows={3}
                    value={form.note}
                    onChange={update("note")}
                    className='w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-primary_green focus:outline-none'
                />
            </div>

            {error && <p className='text-sm text-red-600'>{error}</p>}

            <div className='flex justify-end gap-3'>
                <button
                    type='button'
                    onClick={() => router.back()}
                    className='rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100'
                >
                    Отмена
                </button>
                <button
                    type='submit'
                    disabled={loading}
                    className='rounded-lg bg-primary_green px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-contrast_green disabled:cursor-not-allowed disabled:opacity-60'
                >
                    {loading ? "Сохраняем..." : mode === "create" ? "Создать" : "Сохранить"}
                </button>
            </div>
        </form>
    )
}

function Field({ label, className = "", ...props }) {
    return (
        <div className={className}>
            <label className='mb-1 block text-sm text-gray-700'>{label}</label>
            <input
                {...props}
                className='w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-primary_green focus:outline-none'
            />
        </div>
    )
}
