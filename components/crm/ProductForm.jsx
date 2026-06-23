"use client"
import { useRouter } from "next/navigation"
import { useState } from "react"

const EMPTY = {
    sku: "",
    category: "",
    name: "",
    basePrice: "",
    packagePrice: "",
    recommendedLpuPrice: "",
    transportPackQty: "",
    contents: "",
}

function toFormValue(v) {
    if (v === null || v === undefined) return ""
    if (typeof v === "object" && typeof v.toString === "function") return v.toString()
    return String(v)
}

export default function ProductForm({ initial, mode = "create" }) {
    const router = useRouter()

    const [form, setForm] = useState(() => {
        if (!initial) return EMPTY
        return {
            sku: initial.sku ?? "",
            category: initial.category ?? "",
            name: initial.name ?? "",
            basePrice: toFormValue(initial.basePrice),
            packagePrice: toFormValue(initial.packagePrice),
            recommendedLpuPrice: toFormValue(initial.recommendedLpuPrice),
            transportPackQty: toFormValue(initial.transportPackQty),
            contents: initial.contents ?? "",
        }
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

        const payload = {
            ...form,
            name: form.name.trim() || form.category.trim(),
        }

        const url =
            mode === "create" ? "/api/crm/products" : `/api/crm/products/${initial.id}`
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
        router.push(`/crm/products/${data.item.id}`)
        router.refresh()
    }

    async function handleDelete() {
        if (!confirm("Удалить товар?")) return
        const res = await fetch(`/api/crm/products/${initial.id}`, { method: "DELETE" })
        if (!res.ok) {
            const data = await res.json().catch(() => ({}))
            alert(data.error || "Не удалось удалить")
            return
        }
        router.push("/crm/products")
        router.refresh()
    }

    return (
        <form onSubmit={handleSubmit} className='space-y-5'>
            <Section title='Основное'>
                <Field label='Артикул *' value={form.sku} onChange={update("sku")} required />
                <Field
                    label='Категория *'
                    value={form.category}
                    onChange={update("category")}
                    required
                />
                <Field
                    label='Название (по умолчанию = категория)'
                    value={form.name}
                    onChange={update("name")}
                    className='sm:col-span-2'
                />
            </Section>

            <Section title='Цены и упаковка'>
                <Field
                    label='Базовая цена, ₽'
                    type='number'
                    step='0.01'
                    min='0'
                    inputMode='decimal'
                    value={form.basePrice}
                    onChange={update("basePrice")}
                />
                <Field
                    label='Цена упаковки, ₽'
                    type='number'
                    step='0.01'
                    min='0'
                    inputMode='decimal'
                    value={form.packagePrice}
                    onChange={update("packagePrice")}
                />
                <Field
                    label='Кол-во в транспортной упаковке, шт.'
                    type='number'
                    step='1'
                    min='0'
                    value={form.transportPackQty}
                    onChange={update("transportPackQty")}
                />
                <Field
                    label='Рекомендованная цена ЛПУ, ₽'
                    type='number'
                    step='0.01'
                    min='0'
                    inputMode='decimal'
                    value={form.recommendedLpuPrice}
                    onChange={update("recommendedLpuPrice")}
                />
            </Section>

            <section className='rounded-xl border border-gray-200 bg-white p-5'>
                <h2 className='mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500'>
                    Состав набора
                </h2>
                <p className='mb-3 text-xs text-gray-500'>
                    Одна позиция — одна строка. Пример: «Скальпель для снятия швов — 1 шт.»
                </p>
                <textarea
                    rows={8}
                    value={form.contents}
                    onChange={update("contents")}
                    className='w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm shadow-sm focus:border-primary_green focus:outline-none'
                />
            </section>

            {error && <p className='text-sm text-red-600'>{error}</p>}

            <div className='flex justify-between gap-3'>
                <div>
                    {mode === "edit" && (
                        <button
                            type='button'
                            onClick={handleDelete}
                            className='rounded-lg border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50'
                        >
                            Удалить
                        </button>
                    )}
                </div>
                <div className='flex gap-3'>
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
                className='w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-primary_green focus:outline-none'
            />
        </div>
    )
}
