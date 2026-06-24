"use client"
import { useEffect, useState } from "react"
import { USER_ROLE_LABELS, USER_ROLES } from "@/lib/crm/invite"

const STATUS_LABELS = {
    ACTIVE: "Активен",
    USED: "Использован",
    EXPIRED: "Истёк",
}

const STATUS_CLASS = {
    ACTIVE: "bg-blue-100 text-blue-800",
    USED: "bg-gray-200 text-gray-700",
    EXPIRED: "bg-red-100 text-red-700",
}

function safeJson(text) {
    try {
        return JSON.parse(text)
    } catch {
        return null
    }
}

function fmtDate(d) {
    if (!d) return "—"
    return new Date(d).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" })
}

function statusOf(invite, now = Date.now()) {
    if (invite.usedAt) return "USED"
    if (new Date(invite.expiresAt).getTime() < now) return "EXPIRED"
    return "ACTIVE"
}

function inviteLink(token) {
    if (typeof window === "undefined") return ""
    return `${window.location.origin}/register?invite=${token}`
}

export default function InvitesSection() {
    const [items, setItems] = useState(null)
    const [error, setError] = useState("")
    const [showCreate, setShowCreate] = useState(false)
    const [form, setForm] = useState({ email: "", role: "MANAGER", ttlDays: 7 })
    const [creating, setCreating] = useState(false)
    const [copied, setCopied] = useState(null)

    async function load() {
        setError("")
        const r = await fetch("/api/crm/invites")
        const text = await r.text()
        const data = text ? safeJson(text) : {}
        if (!r.ok) {
            setError(data?.error || `Ошибка ${r.status}`)
            setItems([])
            return
        }
        setItems(data.items || [])
    }

    useEffect(() => {
        load()
    }, [])

    async function handleCreate(e) {
        e.preventDefault()
        setError("")
        setCreating(true)
        const r = await fetch("/api/crm/invites", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
        })
        const text = await r.text()
        const data = text ? safeJson(text) : {}
        setCreating(false)
        if (!r.ok) {
            setError(data?.error || "Не удалось создать инвайт")
            return
        }
        setForm({ email: "", role: "MANAGER", ttlDays: 7 })
        setShowCreate(false)
        await load()
    }

    async function handleCancel(id) {
        if (!confirm("Отменить приглашение?")) return
        const r = await fetch(`/api/crm/invites/${id}`, { method: "DELETE" })
        if (!r.ok) {
            const text = await r.text()
            const data = text ? safeJson(text) : {}
            alert(data?.error || "Не удалось отменить")
            return
        }
        await load()
    }

    async function copyLink(token) {
        const link = inviteLink(token)
        try {
            await navigator.clipboard.writeText(link)
            setCopied(token)
            setTimeout(() => setCopied(null), 1500)
        } catch {
            window.prompt("Скопируйте ссылку вручную:", link)
        }
    }

    return (
        <section className='rounded-xl border border-gray-200 bg-white'>
            <div className='flex items-center justify-between border-b border-gray-100 px-5 py-3'>
                <h2 className='text-sm font-semibold uppercase tracking-wide text-gray-500'>
                    Приглашения
                </h2>
                {!showCreate && (
                    <button
                        type='button'
                        onClick={() => setShowCreate(true)}
                        className='rounded-lg bg-primary_green px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-contrast_green'
                    >
                        Создать приглашение
                    </button>
                )}
            </div>

            {showCreate && (
                <form
                    onSubmit={handleCreate}
                    className='space-y-3 border-b border-gray-100 bg-gray-50 p-5'
                >
                    <div className='grid gap-3 sm:grid-cols-3'>
                        <Field
                            label='Email (опц.)'
                            type='email'
                            value={form.email}
                            onChange={e =>
                                setForm(prev => ({ ...prev, email: e.target.value }))
                            }
                            placeholder='Закрепить за конкретным email'
                        />
                        <div>
                            <label className='mb-1 block text-xs text-gray-600'>Роль</label>
                            <select
                                value={form.role}
                                onChange={e =>
                                    setForm(prev => ({ ...prev, role: e.target.value }))
                                }
                                className='w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary_green focus:outline-none'
                            >
                                {USER_ROLES.map(r => (
                                    <option key={r} value={r}>
                                        {USER_ROLE_LABELS[r]}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className='mb-1 block text-xs text-gray-600'>
                                Срок действия, дней
                            </label>
                            <select
                                value={form.ttlDays}
                                onChange={e =>
                                    setForm(prev => ({
                                        ...prev,
                                        ttlDays: Number(e.target.value),
                                    }))
                                }
                                className='w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary_green focus:outline-none'
                            >
                                {[3, 7, 14, 30].map(n => (
                                    <option key={n} value={n}>
                                        {n}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    {error && <p className='text-sm text-red-600'>{error}</p>}
                    <div className='flex justify-end gap-2'>
                        <button
                            type='button'
                            onClick={() => {
                                setShowCreate(false)
                                setError("")
                            }}
                            className='rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100'
                        >
                            Отмена
                        </button>
                        <button
                            type='submit'
                            disabled={creating}
                            className='rounded-lg bg-primary_green px-3 py-1.5 text-sm font-semibold text-white hover:bg-contrast_green disabled:opacity-60'
                        >
                            {creating ? "Создаём..." : "Создать"}
                        </button>
                    </div>
                </form>
            )}

            <div className='overflow-x-auto'>
                <table className='w-full text-sm'>
                    <thead className='bg-gray-50 text-left text-xs uppercase text-gray-500'>
                        <tr>
                            <th className='px-4 py-3'>Email</th>
                            <th className='px-4 py-3'>Роль</th>
                            <th className='px-4 py-3'>Статус</th>
                            <th className='px-4 py-3'>Истекает</th>
                            <th className='px-4 py-3'>Использован</th>
                            <th className='px-4 py-3'>Кем создан</th>
                            <th className='px-4 py-3'></th>
                        </tr>
                    </thead>
                    <tbody>
                        {items === null && (
                            <tr>
                                <td colSpan={7} className='px-4 py-6 text-center text-gray-400'>
                                    Загрузка...
                                </td>
                            </tr>
                        )}
                        {items?.length === 0 && (
                            <tr>
                                <td colSpan={7} className='px-4 py-6 text-center text-gray-400'>
                                    Приглашений ещё нет
                                </td>
                            </tr>
                        )}
                        {items?.map(inv => {
                            const status = statusOf(inv)
                            return (
                                <tr
                                    key={inv.id}
                                    className='border-t border-gray-100 hover:bg-gray-50'
                                >
                                    <td className='px-4 py-3 text-gray-700'>
                                        {inv.email || "—"}
                                    </td>
                                    <td className='px-4 py-3 text-gray-700'>
                                        {USER_ROLE_LABELS[inv.role] || inv.role}
                                    </td>
                                    <td className='px-4 py-3'>
                                        <span
                                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[status]}`}
                                        >
                                            {STATUS_LABELS[status]}
                                        </span>
                                    </td>
                                    <td className='px-4 py-3 text-gray-700'>
                                        {fmtDate(inv.expiresAt)}
                                    </td>
                                    <td className='px-4 py-3 text-gray-700'>
                                        {inv.usedAt
                                            ? `${fmtDate(inv.usedAt)}${
                                                  inv.usedByEmail
                                                      ? ` · ${inv.usedByEmail}`
                                                      : ""
                                              }`
                                            : "—"}
                                    </td>
                                    <td className='px-4 py-3 text-gray-700'>
                                        {inv.createdBy
                                            ? `${inv.createdBy.firstName ?? ""} ${inv.createdBy.lastName ?? ""}`.trim() ||
                                              inv.createdBy.email
                                            : "—"}
                                    </td>
                                    <td className='px-4 py-3 text-right'>
                                        <div className='flex justify-end gap-2'>
                                            {status === "ACTIVE" && (
                                                <>
                                                    <button
                                                        type='button'
                                                        onClick={() => copyLink(inv.token)}
                                                        className='rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-100'
                                                    >
                                                        {copied === inv.token
                                                            ? "Скопировано!"
                                                            : "Копировать ссылку"}
                                                    </button>
                                                    <button
                                                        type='button'
                                                        onClick={() => handleCancel(inv.id)}
                                                        className='rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50'
                                                    >
                                                        Отменить
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </section>
    )
}

function Field({ label, ...props }) {
    return (
        <div>
            <label className='mb-1 block text-xs text-gray-600'>{label}</label>
            <input
                {...props}
                className='w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary_green focus:outline-none'
            />
        </div>
    )
}
