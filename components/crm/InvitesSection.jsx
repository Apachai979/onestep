"use client"
import { useEffect, useState } from "react"
import { USER_ROLE_LABELS, USER_ROLES } from "@/lib/crm/invite"
import { CardListSkeleton, CardRow, MobileCard, useConfirm, useToast } from "@/components/crm/ui"

const STATUS_LABELS = {
    ACTIVE: "Активен",
    USED: "Использован",
    EXPIRED: "Истёк",
}

const STATUS_CLASS = {
    ACTIVE: "bg-blue-50 text-blue-700",
    USED: "bg-neutral-100 text-neutral-500",
    EXPIRED: "bg-red-50 text-red-700",
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
    const toast = useToast()
    const confirm = useConfirm()
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
        const ok = await confirm({
            title: "Отменить приглашение?",
            description: "Ссылка перестанет работать. Это действие нельзя отменить.",
            confirmText: "Отменить приглашение",
            cancelText: "Не сейчас",
            variant: "danger",
        })
        if (!ok) return
        const r = await fetch(`/api/crm/invites/${id}`, { method: "DELETE" })
        if (!r.ok) {
            const text = await r.text()
            const data = text ? safeJson(text) : {}
            toast.error(data?.error || "Не удалось отменить")
            return
        }
        toast.success("Приглашение отменено")
        await load()
    }

    async function handleReissue(id) {
        const r = await fetch(`/api/crm/invites/${id}/reissue`, { method: "POST" })
        const text = await r.text()
        const data = text ? safeJson(text) : {}
        if (!r.ok) {
            toast.error(data?.error || "Не удалось обновить приглашение")
            return
        }
        toast.success("Приглашение продлено — ссылка снова активна")
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
        <section className='overflow-hidden rounded-2xl border border-line bg-white shadow-sm'>
            <div className='flex items-center justify-between border-b border-line px-6 py-3.5'>
                <h2 className='text-sm font-semibold text-neutral-900'>
                    Приглашения
                </h2>
                {!showCreate && (
                    <button
                        type='button'
                        onClick={() => setShowCreate(true)}
                        className='rounded-lg bg-brand_main px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-brand_main/90'
                    >
                        Создать приглашение
                    </button>
                )}
            </div>

            {showCreate && (
                <form
                    onSubmit={handleCreate}
                    className='space-y-3 border-b border-line bg-surface_muted p-6'
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
                            <label className='mb-1.5 block text-xs font-medium text-neutral-500'>Роль</label>
                            <select
                                value={form.role}
                                onChange={e =>
                                    setForm(prev => ({ ...prev, role: e.target.value }))
                                }
                                className='h-10 w-full rounded-xl border border-line bg-white px-3 text-sm text-neutral-900 shadow-sm transition-all duration-200 focus:border-brand_main focus:outline-none focus:ring-2 focus:ring-brand_main/20'
                            >
                                {USER_ROLES.map(r => (
                                    <option key={r} value={r}>
                                        {USER_ROLE_LABELS[r]}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className='mb-1 block text-xs text-neutral-500'>
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
                                className='h-10 w-full rounded-xl border border-line bg-white px-3 text-sm text-neutral-900 shadow-sm transition-all duration-200 focus:border-brand_main focus:outline-none focus:ring-2 focus:ring-brand_main/20'
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
                            className='rounded-lg border border-line px-3 py-1.5 text-sm text-neutral-700 hover:bg-surface_muted'
                        >
                            Отмена
                        </button>
                        <button
                            type='submit'
                            disabled={creating}
                            className='rounded-lg bg-brand_main px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand_main/90 disabled:opacity-60'
                        >
                            {creating ? "Создаём..." : "Создать"}
                        </button>
                    </div>
                </form>
            )}

            {/* Мобильные карточки */}
            <div className='space-y-3 p-4 md:hidden'>
                {items === null && <CardListSkeleton rows={2} />}
                {items?.length === 0 && (
                    <p className='py-4 text-center text-sm text-neutral-400'>
                        Приглашений ещё нет
                    </p>
                )}
                {items?.map(inv => {
                    const status = statusOf(inv)
                    return (
                        <MobileCard key={inv.id}>
                            <div className='flex items-start justify-between gap-2'>
                                <span className='min-w-0 truncate font-medium text-neutral-800'>
                                    {inv.email || "Без email"}
                                </span>
                                <span
                                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[status]}`}
                                >
                                    {STATUS_LABELS[status]}
                                </span>
                            </div>
                            <div className='mt-2 space-y-1'>
                                <CardRow label='Роль'>
                                    {USER_ROLE_LABELS[inv.role] || inv.role}
                                </CardRow>
                                <CardRow label='Истекает'>{fmtDate(inv.expiresAt)}</CardRow>
                                {inv.usedAt && (
                                    <CardRow label='Использован'>
                                        {fmtDate(inv.usedAt)}
                                        {inv.usedByEmail ? ` · ${inv.usedByEmail}` : ""}
                                    </CardRow>
                                )}
                                <CardRow label='Кем создан'>
                                    {inv.createdBy
                                        ? `${inv.createdBy.firstName ?? ""} ${inv.createdBy.lastName ?? ""}`.trim() ||
                                          inv.createdBy.email
                                        : "—"}
                                </CardRow>
                            </div>
                            {status === "ACTIVE" && (
                                <div className='mt-3 flex justify-end gap-2'>
                                    <button
                                        type='button'
                                        onClick={() => copyLink(inv.token)}
                                        className='rounded-md border border-line px-3 py-1.5 text-xs text-neutral-700 hover:bg-surface_muted'
                                    >
                                        {copied === inv.token
                                            ? "Скопировано!"
                                            : "Копировать ссылку"}
                                    </button>
                                    <button
                                        type='button'
                                        onClick={() => handleCancel(inv.id)}
                                        className='rounded-md border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50'
                                    >
                                        Отменить
                                    </button>
                                </div>
                            )}
                            {status === "EXPIRED" && (
                                <div className='mt-3 flex justify-end gap-2'>
                                    <button
                                        type='button'
                                        onClick={() => handleReissue(inv.id)}
                                        className='rounded-md border border-line px-3 py-1.5 text-xs text-neutral-700 hover:bg-surface_muted'
                                    >
                                        Выслать заново
                                    </button>
                                </div>
                            )}
                        </MobileCard>
                    )
                })}
            </div>

            <div className='hidden overflow-x-auto md:block'>
                <table className='w-full text-sm'>
                    <thead className='bg-surface_muted text-left text-xs font-medium uppercase tracking-wide text-neutral-500'>
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
                                <td colSpan={7} className='px-4 py-6 text-center text-neutral-400'>
                                    Загрузка...
                                </td>
                            </tr>
                        )}
                        {items?.length === 0 && (
                            <tr>
                                <td colSpan={7} className='px-4 py-6 text-center text-neutral-400'>
                                    Приглашений ещё нет
                                </td>
                            </tr>
                        )}
                        {items?.map(inv => {
                            const status = statusOf(inv)
                            return (
                                <tr
                                    key={inv.id}
                                    className='border-t border-line hover:bg-surface_muted'
                                >
                                    <td className='px-4 py-3 text-neutral-700'>
                                        {inv.email || "—"}
                                    </td>
                                    <td className='px-4 py-3 text-neutral-700'>
                                        {USER_ROLE_LABELS[inv.role] || inv.role}
                                    </td>
                                    <td className='px-4 py-3'>
                                        <span
                                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[status]}`}
                                        >
                                            {STATUS_LABELS[status]}
                                        </span>
                                    </td>
                                    <td className='px-4 py-3 text-neutral-700'>
                                        {fmtDate(inv.expiresAt)}
                                    </td>
                                    <td className='px-4 py-3 text-neutral-700'>
                                        {inv.usedAt
                                            ? `${fmtDate(inv.usedAt)}${
                                                  inv.usedByEmail
                                                      ? ` · ${inv.usedByEmail}`
                                                      : ""
                                              }`
                                            : "—"}
                                    </td>
                                    <td className='px-4 py-3 text-neutral-700'>
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
                                                        className='rounded-md border border-line px-2 py-1 text-xs text-neutral-700 hover:bg-surface_muted'
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
                                            {status === "EXPIRED" && (
                                                <button
                                                    type='button'
                                                    onClick={() => handleReissue(inv.id)}
                                                    className='rounded-md border border-line px-2 py-1 text-xs text-neutral-700 hover:bg-surface_muted'
                                                >
                                                    Выслать заново
                                                </button>
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
            <label className='mb-1 block text-xs text-neutral-500'>{label}</label>
            <input
                {...props}
                className='h-10 w-full rounded-xl border border-line bg-white px-3 text-sm text-neutral-900 shadow-sm transition-all duration-200 placeholder:text-neutral-400 focus:border-brand_main focus:outline-none focus:ring-2 focus:ring-brand_main/20'
            />
        </div>
    )
}
