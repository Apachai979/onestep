"use client"
import { useEffect, useState } from "react"
import { Button, useToast } from "@/components/crm/ui"

// Редактор шаблона письма, которым КП уходит клиенту.
// props: placeholders — [[«{{number}}», «описание»], ...]
export default function ProposalEmailSettings({ placeholders }) {
    const toast = useToast()
    const [subject, setSubject] = useState("")
    const [body, setBody] = useState("")
    const [defaults, setDefaults] = useState(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        fetch("/api/crm/settings/proposal-email")
            .then(r => r.json())
            .then(d => {
                setSubject(d.subject || "")
                setBody(d.body || "")
                setDefaults(d.defaults || null)
            })
            .catch(() => toast.error("Не удалось загрузить шаблон"))
            .finally(() => setLoading(false))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    async function save(next = null) {
        setSaving(true)
        try {
            const payload = next || { subject, body }
            const r = await fetch("/api/crm/settings/proposal-email", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            })
            const d = await r.json().catch(() => ({}))
            if (!r.ok) {
                toast.error(d?.error || "Не удалось сохранить")
                return
            }
            setSubject(d.subject)
            setBody(d.body)
            toast.success("Шаблон сохранён")
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return <p className='text-sm text-neutral-400'>Загрузка...</p>
    }

    return (
        <section className='rounded-2xl border border-line bg-white p-6 shadow-sm'>
            <h2 className='text-sm font-semibold text-neutral-900'>
                Шаблон письма с КП
            </h2>
            <p className='mt-1 text-sm text-neutral-500'>
                Используется при отправке коммерческого предложения клиенту со
                страницы «Сформировать КП». Менеджер видит текст перед отправкой и
                может подправить его под конкретного клиента.
            </p>

            <div className='mt-4 space-y-3'>
                <div>
                    <label className='mb-1.5 block text-xs font-medium text-neutral-500'>Тема письма</label>
                    <input
                        value={subject}
                        onChange={e => setSubject(e.target.value)}
                        className='h-10 w-full rounded-xl border border-line bg-white px-3 text-sm text-neutral-900 shadow-sm transition-all duration-200 focus:border-brand_main focus:outline-none focus:ring-2 focus:ring-brand_main/20'
                    />
                </div>
                <div>
                    <label className='mb-1.5 block text-xs font-medium text-neutral-500'>Текст письма</label>
                    <textarea
                        rows={12}
                        value={body}
                        onChange={e => setBody(e.target.value)}
                        className='w-full rounded-xl border border-line bg-white px-3 py-2 font-mono text-sm text-neutral-900 shadow-sm transition-all duration-200 focus:border-brand_main focus:outline-none focus:ring-2 focus:ring-brand_main/20'
                    />
                </div>

                <div className='rounded-xl bg-surface_muted p-3 text-xs leading-relaxed text-neutral-500'>
                    <p className='mb-1 font-semibold'>Подстановки:</p>
                    <ul className='grid gap-x-6 gap-y-0.5 sm:grid-cols-2'>
                        {placeholders.map(([ph, hint]) => (
                            <li key={ph}>
                                <code className='rounded bg-white px-1 py-0.5'>{ph}</code>{" "}
                                — {hint}
                            </li>
                        ))}
                    </ul>
                </div>

                <div className='flex flex-wrap justify-end gap-2'>
                    <Button
                        type='button'
                        variant='secondary'
                        disabled={saving}
                        onClick={() => {
                            if (defaults) save({ subject: "", body: "" })
                        }}
                        title='Вернуть стандартный текст'
                    >
                        Сбросить к стандартному
                    </Button>
                    <Button type='button' onClick={() => save()} loading={saving}>
                        Сохранить
                    </Button>
                </div>
            </div>
        </section>
    )
}
