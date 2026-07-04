"use client"
import { useEffect, useState } from "react"
import { useToast } from "@/components/crm/ui"

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
        return <p className='text-sm text-night_green/55'>Загрузка...</p>
    }

    return (
        <section className='rounded-xl border border-brand_soft/40 bg-white/70 p-5'>
            <h2 className='text-sm font-semibold uppercase tracking-wide text-gray-500'>
                Шаблон письма с КП
            </h2>
            <p className='mt-1 text-sm text-night_green/60'>
                Используется при отправке коммерческого предложения клиенту со
                страницы «Сформировать КП». Менеджер видит текст перед отправкой и
                может подправить его под конкретного клиента.
            </p>

            <div className='mt-4 space-y-3'>
                <div>
                    <label className='mb-1 block text-xs text-gray-600'>Тема письма</label>
                    <input
                        value={subject}
                        onChange={e => setSubject(e.target.value)}
                        className='w-full rounded-lg border border-brand_soft/60 px-3 py-2 text-sm shadow-sm focus:border-brand_main focus:outline-none'
                    />
                </div>
                <div>
                    <label className='mb-1 block text-xs text-gray-600'>Текст письма</label>
                    <textarea
                        rows={12}
                        value={body}
                        onChange={e => setBody(e.target.value)}
                        className='w-full rounded-lg border border-brand_soft/60 px-3 py-2 font-mono text-sm shadow-sm focus:border-brand_main focus:outline-none'
                    />
                </div>

                <div className='rounded-lg bg-brand_soft/15 p-3 text-xs leading-relaxed text-night_green/70'>
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
                    <button
                        type='button'
                        disabled={saving}
                        onClick={() => {
                            if (defaults) save({ subject: "", body: "" })
                        }}
                        className='rounded-lg border border-brand_soft/60 px-4 py-2 text-sm text-gray-700 hover:bg-brand_soft/30 disabled:opacity-60'
                        title='Вернуть стандартный текст'
                    >
                        Сбросить к стандартному
                    </button>
                    <button
                        type='button'
                        disabled={saving}
                        onClick={() => save()}
                        className='rounded-lg bg-brand_main px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand_main/90 disabled:opacity-60'
                    >
                        {saving ? "Сохраняем..." : "Сохранить"}
                    </button>
                </div>
            </div>
        </section>
    )
}
