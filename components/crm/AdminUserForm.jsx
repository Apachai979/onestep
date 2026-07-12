"use client"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { LuCheck, LuCopy, LuEye, LuEyeOff, LuKeyRound } from "react-icons/lu"
import { USER_ROLES, USER_ROLE_LABELS, USER_STATUSES, USER_STATUS_LABELS } from "@/lib/crm/invite"
import { Button, Modal, useToast } from "@/components/crm/ui"

function safeJson(text) {
    try {
        return JSON.parse(text)
    } catch {
        return null
    }
}

// Криптостойкий пароль без похожих символов (0/O, 1/l/I).
function generatePassword(length = 14) {
    const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    const arr = new Uint32Array(length)
    crypto.getRandomValues(arr)
    let out = ""
    for (let i = 0; i < length; i++) out += chars[arr[i] % chars.length]
    return out
}

export default function AdminUserForm({ initial, isSelf }) {
    const router = useRouter()
    const [resetOpen, setResetOpen] = useState(false)
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

            <section className='rounded-2xl border border-line bg-white p-6 shadow-sm'>
                <h2 className='text-sm font-semibold text-neutral-900'>Безопасность</h2>
                <p className='mt-1 text-sm text-neutral-500'>
                    Задайте сотруднику новый пароль для входа в CRM.
                </p>
                <Button
                    type='button'
                    variant='secondary'
                    className='mt-4'
                    onClick={() => setResetOpen(true)}
                >
                    <LuKeyRound className='h-4 w-4' />
                    Сбросить пароль
                </Button>
            </section>

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

            <ResetPasswordModal
                open={resetOpen}
                onClose={() => setResetOpen(false)}
                userId={initial.id}
                email={initial.email}
            />
        </form>
    )
}

function ResetPasswordModal({ open, onClose, userId, email }) {
    const toast = useToast()
    const [password, setPassword] = useState("")
    const [show, setShow] = useState(true)
    const [copied, setCopied] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    useEffect(() => {
        if (open) {
            setPassword("")
            setShow(true)
            setCopied(false)
            setError("")
        }
    }, [open])

    async function copy() {
        try {
            await navigator.clipboard.writeText(password)
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
        } catch {
            window.prompt("Скопируйте пароль вручную:", password)
        }
    }

    async function submit() {
        setError("")
        if (password.length < 8) {
            setError("Пароль должен содержать минимум 8 символов")
            return
        }
        setLoading(true)
        const r = await fetch(`/api/crm/admin/users/${userId}/reset-password`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password }),
        })
        const text = await r.text()
        const data = text ? safeJson(text) : {}
        setLoading(false)
        if (!r.ok) {
            setError(data?.error || "Не удалось сбросить пароль")
            return
        }
        toast.success("Пароль обновлён")
        onClose()
    }

    return (
        <Modal
            open={open}
            onClose={onClose}
            title='Сброс пароля'
            description={email}
            size='md'
            footer={
                <>
                    <Button type='button' variant='secondary' onClick={onClose}>
                        Отмена
                    </Button>
                    <Button
                        type='button'
                        onClick={submit}
                        loading={loading}
                        disabled={password.length < 8}
                    >
                        Сохранить пароль
                    </Button>
                </>
            }
        >
            <div className='space-y-3'>
                <div>
                    <label className='mb-1.5 block text-sm text-neutral-600'>Новый пароль</label>
                    <div className='flex gap-2'>
                        <input
                            type={show ? "text" : "password"}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder='Минимум 8 символов'
                            autoComplete='new-password'
                            className='h-10 flex-1 rounded-xl border border-line bg-white px-3 font-mono text-sm text-neutral-900 shadow-sm transition-all duration-200 placeholder:font-sans placeholder:text-neutral-400 focus:border-brand_main focus:outline-none focus:ring-2 focus:ring-brand_main/20'
                        />
                        <button
                            type='button'
                            onClick={() => setShow(s => !s)}
                            aria-label={show ? "Скрыть пароль" : "Показать пароль"}
                            className='inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line text-neutral-500 hover:bg-surface_muted'
                        >
                            {show ? <LuEyeOff className='h-4 w-4' /> : <LuEye className='h-4 w-4' />}
                        </button>
                    </div>
                </div>

                <div className='flex flex-wrap gap-2'>
                    <button
                        type='button'
                        onClick={() => {
                            setPassword(generatePassword())
                            setShow(true)
                        }}
                        className='inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-surface_muted'
                    >
                        <LuKeyRound className='h-3.5 w-3.5' />
                        Сгенерировать
                    </button>
                    {password && (
                        <button
                            type='button'
                            onClick={copy}
                            className='inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-surface_muted'
                        >
                            {copied ? (
                                <LuCheck className='h-3.5 w-3.5 text-emerald-600' />
                            ) : (
                                <LuCopy className='h-3.5 w-3.5' />
                            )}
                            {copied ? "Скопировано" : "Копировать"}
                        </button>
                    )}
                </div>

                {error && <p className='text-sm text-red-600'>{error}</p>}

                <p className='rounded-lg bg-surface_muted p-3 text-xs leading-relaxed text-neutral-500'>
                    Система не отправляет писем — передайте новый пароль сотруднику лично.
                    Старый пароль перестанет работать сразу после сохранения.
                </p>
            </div>
        </Modal>
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
