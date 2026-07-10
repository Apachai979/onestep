"use client"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { USER_ROLES, USER_ROLE_LABELS, USER_STATUSES, USER_STATUS_LABELS } from "@/lib/crm/invite"
import { Button } from "@/components/crm/ui"

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
                    <label className='mb-1.5 block text-sm text-neutral-600'>Роль</label>
                    <select
                        value={form.role}
                        onChange={update("role")}
                        disabled={isSelf}
                        className='h-10 w-full rounded-xl border border-line bg-white px-3 text-sm text-neutral-900 shadow-sm transition-all duration-200 focus:border-brand_main focus:outline-none focus:ring-2 focus:ring-brand_main/20 disabled:bg-surface_muted disabled:text-neutral-400'
                    >
                        {USER_ROLES.map(r => (
                            <option key={r} value={r}>
                                {USER_ROLE_LABELS[r]}
                            </option>
                        ))}
                    </select>
                    {isSelf && (
                        <p className='mt-1 text-xs text-neutral-400'>
                            Свою роль изменить нельзя.
                        </p>
                    )}
                </div>
                <div>
                    <label className='mb-1.5 block text-sm text-neutral-600'>Статус</label>
                    <select
                        value={form.status}
                        onChange={update("status")}
                        disabled={isSelf}
                        className='h-10 w-full rounded-xl border border-line bg-white px-3 text-sm text-neutral-900 shadow-sm transition-all duration-200 focus:border-brand_main focus:outline-none focus:ring-2 focus:ring-brand_main/20 disabled:bg-surface_muted disabled:text-neutral-400'
                    >
                        {USER_STATUSES.map(s => (
                            <option key={s} value={s}>
                                {USER_STATUS_LABELS[s]}
                            </option>
                        ))}
                    </select>
                    {isSelf && (
                        <p className='mt-1 text-xs text-neutral-400'>
                            Свой статус изменить нельзя.
                        </p>
                    )}
                </div>
            </Section>

            {error && (
                <p className='rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700'>
                    {error}
                </p>
            )}

            <div className='flex justify-end gap-3'>
                <Button type='button' variant='secondary' onClick={() => router.back()}>
                    Отмена
                </Button>
                <Button type='submit' loading={loading}>
                    Сохранить
                </Button>
            </div>
        </form>
    )
}

function Section({ title, children }) {
    return (
        <section className='rounded-2xl border border-line bg-white p-6 shadow-sm'>
            <h2 className='mb-4 text-sm font-semibold text-neutral-900'>{title}</h2>
            <div className='grid gap-4 sm:grid-cols-2'>{children}</div>
        </section>
    )
}

function Field({ label, className = "", ...props }) {
    return (
        <div className={className}>
            <label className='mb-1.5 block text-sm text-neutral-600'>{label}</label>
            <input
                {...props}
                className='h-10 w-full rounded-xl border border-line bg-white px-3 text-sm text-neutral-900 shadow-sm transition-all duration-200 placeholder:text-neutral-400 focus:border-brand_main focus:outline-none focus:ring-2 focus:ring-brand_main/20 disabled:bg-surface_muted disabled:text-neutral-400'
            />
        </div>
    )
}
