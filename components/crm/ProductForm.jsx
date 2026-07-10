"use client"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Button, useConfirm, useToast } from "@/components/crm/ui"

const EMPTY = {
    sku: "",
    category: "",
    name: "",
    basePrice: "",
    packagePrice: "",
    recommendedLpuPrice: "",
    transportPackQty: "",
    unitWeightKg: "",
    unitVolumeM3: "",
    contents: "",
}

function toFormValue(v) {
    if (v === null || v === undefined) return ""
    if (typeof v === "object" && typeof v.toString === "function") return v.toString()
    return String(v)
}

export default function ProductForm({ initial, mode = "create" }) {
    const router = useRouter()
    const toast = useToast()
    const confirm = useConfirm()

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
            unitWeightKg: toFormValue(initial.unitWeightKg),
            unitVolumeM3: toFormValue(initial.unitVolumeM3),
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
        const ok = await confirm({
            title: "Удалить товар?",
            description: `${initial?.sku || ""} ${initial?.category || ""}\nДействие нельзя отменить.`,
            confirmText: "Удалить",
            variant: "danger",
        })
        if (!ok) return
        const res = await fetch(`/api/crm/products/${initial.id}`, { method: "DELETE" })
        if (!res.ok) {
            const data = await res.json().catch(() => ({}))
            toast.error(data.error || "Не удалось удалить")
            return
        }
        toast.success("Товар удалён")
        router.push("/crm/products")
        router.refresh()
    }

    return (
        <form onSubmit={handleSubmit} className='space-y-4'>
            <Section title='Основное'>
                <Field label='Артикул *' value={form.sku} onChange={update("sku")} required />
                <Field
                    label='Наименование *'
                    value={form.category}
                    onChange={update("category")}
                    required
                />
                <Field
                    label='Внутреннее обозначение (опц.)'
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
                <Field
                    label='Вес единицы, кг'
                    type='number'
                    step='0.001'
                    min='0'
                    inputMode='decimal'
                    value={form.unitWeightKg}
                    onChange={update("unitWeightKg")}
                />
                <Field
                    label='Объём единицы, м³'
                    type='number'
                    step='0.0001'
                    min='0'
                    inputMode='decimal'
                    value={form.unitVolumeM3}
                    onChange={update("unitVolumeM3")}
                />
            </Section>

            <section className='rounded-2xl border border-line bg-white p-6 shadow-sm'>
                <h2 className='mb-2 text-sm font-semibold text-neutral-900'>
                    Состав набора
                </h2>
                <p className='mb-3 text-xs text-neutral-500'>
                    Одна позиция — одна строка. Пример: «Скальпель для снятия швов — 1 шт.»
                </p>
                <textarea
                    rows={8}
                    value={form.contents}
                    onChange={update("contents")}
                    className='w-full rounded-xl border border-line bg-white px-3 py-2 font-mono text-sm text-neutral-900 shadow-sm transition-all duration-200 focus:border-brand_main focus:outline-none focus:ring-2 focus:ring-brand_main/20'
                />
            </section>

            {error && (
                <p className='rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700'>
                    {error}
                </p>
            )}

            <div className='flex justify-between gap-3'>
                <div>
                    {mode === "edit" && (
                        <Button type='button' variant='danger_soft' onClick={handleDelete}>
                            Удалить
                        </Button>
                    )}
                </div>
                <div className='flex gap-3'>
                    <Button type='button' variant='secondary' onClick={() => router.back()}>
                        Отмена
                    </Button>
                    <Button type='submit' loading={loading}>
                        {mode === "create" ? "Создать" : "Сохранить"}
                    </Button>
                </div>
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
                className='h-10 w-full rounded-xl border border-line bg-white px-3 text-sm text-neutral-900 shadow-sm transition-all duration-200 placeholder:text-neutral-400 focus:border-brand_main focus:outline-none focus:ring-2 focus:ring-brand_main/20'
            />
        </div>
    )
}
