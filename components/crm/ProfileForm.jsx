"use client"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useSession } from "next-auth/react"
import { LuBell, LuMail, LuSend } from "react-icons/lu"
import AccessSection from "@/components/crm/AccessSection"
import { Button, Field, Input, Section, useToast } from "@/components/crm/ui"

function safeJson(text) {
    try {
        return JSON.parse(text)
    } catch {
        return null
    }
}

// Подпись сверху + невысокий инпут: форма короткая, floating-label здесь
// растянул бы её почти вдвое.
function TextField({ id, label, hint, ...rest }) {
    return (
        <Field label={label} hint={hint} htmlFor={id}>
            <Input id={id} {...rest} />
        </Field>
    )
}

export default function ProfileForm({ initial }) {
    const router = useRouter()
    const toast = useToast()
    const { update: updateSession } = useSession()
    const [form, setForm] = useState({
        firstName: initial.firstName ?? "",
        lastName: initial.lastName ?? "",
        phone: initial.phone ?? "",
        position: initial.position ?? "",
        telegram: initial.telegram ?? "",
    })
    const [error, setError] = useState("")
    const [saving, setSaving] = useState(false)

    function update(field) {
        return e => setForm(prev => ({ ...prev, [field]: e.target.value }))
    }

    async function handleSubmit(e) {
        e.preventDefault()
        setError("")
        setSaving(true)
        try {
            const r = await fetch("/api/crm/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            })
            const text = await r.text()
            const data = text ? safeJson(text) : {}
            if (!r.ok) {
                setError(data?.error || "Не удалось сохранить")
                return
            }
            setForm(f => ({ ...f, telegram: data.item?.telegram ?? "" }))
            // Имя лежит в JWT — без этого в сайдбаре останется старое.
            await updateSession({ name: data.name })
            toast.success("Профиль сохранён")
            router.refresh()
        } finally {
            setSaving(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className='space-y-5'>
            <Section title='Личные данные'>
                <div className='grid gap-x-4 gap-y-3 sm:grid-cols-2'>
                    <TextField
                        id='profile-first-name'
                        label='Имя'
                        value={form.firstName}
                        onChange={update("firstName")}
                    />
                    <TextField
                        id='profile-last-name'
                        label='Фамилия'
                        value={form.lastName}
                        onChange={update("lastName")}
                    />
                    <TextField
                        id='profile-phone'
                        label='Телефон'
                        type='tel'
                        value={form.phone}
                        onChange={update("phone")}
                    />
                    <TextField
                        id='profile-telegram'
                        label='Телеграм'
                        placeholder='@username или t.me/username'
                        value={form.telegram}
                        onChange={update("telegram")}
                    />
                    <TextField
                        id='profile-position'
                        label='Должность'
                        value={form.position}
                        onChange={update("position")}
                    />
                    <TextField
                        id='profile-email'
                        label='Email'
                        value={initial.email}
                        disabled
                        hint='Логин в CRM, меняет администратор'
                    />
                </div>
            </Section>

            <AccessSection user={initial} />

            <Section title='Уведомления' icon={LuBell}>
                <p className='text-sm text-neutral-500'>
                    Скоро здесь можно будет выбрать, как получать напоминания о задачах и
                    событиях по сделкам — каждый настроит под себя.
                </p>
                <ul className='mt-3 space-y-2 text-sm text-neutral-400'>
                    <li className='flex items-center gap-2'>
                        <LuSend className='h-4 w-4 shrink-0' />
                        Телеграм — понадобится привязать аккаунт к боту
                    </li>
                    <li className='flex items-center gap-2'>
                        <LuMail className='h-4 w-4 shrink-0' />
                        Почта — на {initial.email}
                    </li>
                </ul>
            </Section>

            {error && (
                <p className='rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700'>
                    {error}
                </p>
            )}

            <div className='flex justify-end'>
                <Button type='submit' loading={saving}>
                    Сохранить
                </Button>
            </div>
        </form>
    )
}
