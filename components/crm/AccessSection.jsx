"use client"
import { useState } from "react"
import { USER_ROLE_LABELS, USER_STATUS_LABELS } from "@/lib/crm/invite"
import { PASSWORD_MIN_LENGTH } from "@/lib/crm/password"
import { Badge, Button, Input, Section, useToast } from "@/components/crm/ui"

const EMPTY = { currentPassword: "", newPassword: "", newPasswordConfirm: "" }

function safeJson(text) {
    try {
        return JSON.parse(text)
    } catch {
        return null
    }
}

// Роль, статус и пароль — всё, что относится к доступу в CRM. Блок пароля
// раскрывается по кнопке: меняют его раз в полгода, а место занимал бы всегда.
// Секция рендерится внутри <form> профиля, поэтому своей формы здесь нет —
// вложенные <form> невалидны. Отсюда же ручной перехват Enter и кнопка
// type='button': сабмит профиля не должен утаскивать с собой пароль.
export default function AccessSection({ user }) {
    const toast = useToast()
    const [open, setOpen] = useState(false)
    const [form, setForm] = useState(EMPTY)
    const [show, setShow] = useState(false)
    const [error, setError] = useState("")
    const [saving, setSaving] = useState(false)

    function update(field) {
        return e => setForm(prev => ({ ...prev, [field]: e.target.value }))
    }

    function close() {
        setOpen(false)
        setForm(EMPTY)
        setShow(false)
        setError("")
    }

    const filled =
        form.currentPassword && form.newPassword && form.newPasswordConfirm

    function handleKeyDown(e) {
        if (e.key !== "Enter") return
        // Иначе Enter улетит в форму профиля и сохранит контакты вместо пароля.
        e.preventDefault()
        if (filled && !saving) handleSubmit()
    }

    async function handleSubmit() {
        setError("")

        if (form.newPassword !== form.newPasswordConfirm) {
            setError("Новый пароль и подтверждение не совпадают")
            return
        }

        setSaving(true)
        try {
            const r = await fetch("/api/crm/profile/password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    currentPassword: form.currentPassword,
                    newPassword: form.newPassword,
                }),
            })
            const text = await r.text()
            const data = text ? safeJson(text) : {}
            if (!r.ok) {
                setError(data?.error || "Не удалось сменить пароль")
                return
            }
            close()
            toast.success("Пароль обновлён")
        } finally {
            setSaving(false)
        }
    }

    const type = show ? "text" : "password"

    return (
        <Section title='Доступ'>
            <div className='flex flex-wrap items-center gap-2'>
                <Badge tone={user.role === "ADMIN" ? "warning" : "info"} size='sm'>
                    {USER_ROLE_LABELS[user.role] || user.role}
                </Badge>
                <Badge tone={user.status === "ACTIVE" ? "success" : "danger"} size='sm'>
                    {USER_STATUS_LABELS[user.status] || user.status}
                </Badge>
                <span className='text-xs text-neutral-400'>
                    назначает администратор
                </span>
            </div>

            <div className='mt-4 border-t border-line pt-4'>
                <div className='flex flex-wrap items-center justify-between gap-3'>
                    <div className='text-sm text-neutral-700'>
                        Пароль
                        <span className='ml-2 tracking-widest text-neutral-400'>
                            ••••••••
                        </span>
                    </div>
                    <Button
                        type='button'
                        variant='ghost'
                        size='sm'
                        onClick={() => (open ? close() : setOpen(true))}
                    >
                        {open ? "Отмена" : "Изменить"}
                    </Button>
                </div>

                {open && (
                    <div className='mt-3' onKeyDown={handleKeyDown}>
                        <div className='grid gap-2 sm:grid-cols-3'>
                            <Input
                                type={type}
                                autoComplete='current-password'
                                placeholder='Текущий пароль'
                                aria-label='Текущий пароль'
                                value={form.currentPassword}
                                onChange={update("currentPassword")}
                            />
                            <Input
                                type={type}
                                autoComplete='new-password'
                                minLength={PASSWORD_MIN_LENGTH}
                                placeholder={`Новый (от ${PASSWORD_MIN_LENGTH} символов)`}
                                aria-label='Новый пароль'
                                value={form.newPassword}
                                onChange={update("newPassword")}
                            />
                            <Input
                                type={type}
                                autoComplete='new-password'
                                minLength={PASSWORD_MIN_LENGTH}
                                placeholder='Повторите новый'
                                aria-label='Повторите новый пароль'
                                value={form.newPasswordConfirm}
                                onChange={update("newPasswordConfirm")}
                            />
                        </div>

                        {error && <p className='mt-2 text-xs text-red-600'>{error}</p>}

                        <div className='mt-3 flex items-center justify-between gap-3'>
                            <button
                                type='button'
                                onClick={() => setShow(v => !v)}
                                className='text-xs text-neutral-500 hover:text-neutral-800'
                            >
                                {show ? "Скрыть пароли" : "Показать пароли"}
                            </button>
                            <Button
                                type='button'
                                size='sm'
                                loading={saving}
                                disabled={!filled}
                                onClick={handleSubmit}
                            >
                                Сохранить пароль
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </Section>
    )
}
