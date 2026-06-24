"use client"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { USER_ROLES, USER_ROLE_LABELS, USER_STATUSES, USER_STATUS_LABELS } from "@/lib/crm/invite"

function safeJson(text) {
    try {
        return JSON.parse(text)
    } catch {
        return null
    }
}

export default function AdminUserForm({ initial, isSelf }) {
    const router = useRouter()
    const [form, setForm] = useState({
        firstName: initial.firstName ?? "",
        lastName: initial.lastName ?? "",
        phone: initial.phone ?? "",
        position: initial.position ?? "",
        role: initial.role,
        status: initial.status,
    })
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)

    function update(field) {
        return e => setForm(prev => ({ ...prev, [field]: e.target.value }))
    }

    async function handleSubmit(e) {
        e.preventDefault()
        setError("")
        setLoading(true)
        const r = await fetch(`/api/crm/admin/users/${initial.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
        })
        const text = await r.text()
        const data = text ? safeJson(text) : {}
        setLoading(false)
        if (!r.ok) {
            setError(data?.error || "Не удалось сохранить")
            return
        }
        router.push("/crm/users")
        router.refresh()
    }

    return (
        <form onSubmit={handleSubmit} className='space-y-5'>
            <Section title='Основное'>
                <Field label='Email' value={initial.email} disabled />
                <Field label='Имя' value={form.firstName} onChange={update("firstName")} />
                <Field label='Фамилия' value={form.lastName} onChange={update("lastName")} />
                <Field label='Телефон' value={form.phone} onChange={update("phone")} />
                <Field
                    label='Должность'
                    value={form.position}
                    onChange={update("position")}
                    className='sm:col-span-2'
                />
            </Section>

            <Section title='Доступ'>
                <div>
                    <label className='mb-1 block text-sm text-gray-700'>Роль</label>
                    <select
                        value={form.role}
                        onChange={update("role")}
                        disabled={isSelf}
                        className='w-full rounded-lg border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-primary_green focus:outline-none disabled:bg-gray-50 disabled:text-gray-400'
                    >
                        {USER_ROLES.map(r => (
                            <option key={r} value={r}>
                                {USER_ROLE_LABELS[r]}
                            </option>
                        ))}
                    </select>
                    {isSelf && (
                        <p className='mt-1 text-xs text-gray-500'>
                            Свою роль изменить нельзя.
                        </p>
                    )}
                </div>
                <div>
                    <label className='mb-1 block text-sm text-gray-700'>Статус</label>
                    <select
                        value={form.status}
                        onChange={update("status")}
                        disabled={isSelf}
                        className='w-full rounded-lg border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-primary_green focus:outline-none disabled:bg-gray-50 disabled:text-gray-400'
                    >
                        {USER_STATUSES.map(s => (
                            <option key={s} value={s}>
                                {USER_STATUS_LABELS[s]}
                            </option>
                        ))}
                    </select>
                    {isSelf && (
                        <p className='mt-1 text-xs text-gray-500'>
                            Свой статус изменить нельзя.
                        </p>
                    )}
                </div>
            </Section>

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
                    {loading ? "Сохраняем..." : "Сохранить"}
                </button>
            </div>
        </form>
    )
}

function Section({ title, children }) {
    return (
        <section className='rounded-xl border border-gray-200 bg-white p-5'>
            <h2 className='mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500'>
                {title}
            </h2>
            <div className='grid gap-4 sm:grid-cols-2'>{children}</div>
        </section>
    )
}

function Field({ label, className = "", ...props }) {
    return (
        <div className={className}>
            <label className='mb-1 block text-sm text-gray-700'>{label}</label>
            <input
                {...props}
                className='w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-primary_green focus:outline-none disabled:bg-gray-50 disabled:text-gray-500'
            />
        </div>
    )
}
