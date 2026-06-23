"use client"
import { useRouter } from "next/navigation"
import { useState } from "react"

const EMPTY = {
    name: "",
    region: "",
    inn: "",
    kpp: "",
    ogrn: "",
    okpo: "",
    okved: "",
    bankName: "",
    bankAccount: "",
    bankCorrAccount: "",
    bik: "",
    totalRevenue: "",
    discount: "",
    phone: "",
    email: "",
    address: "",
    note: "",
}

function toFormValue(v) {
    if (v === null || v === undefined) return ""
    if (typeof v === "object" && typeof v.toString === "function") return v.toString()
    return String(v)
}

export default function CounterpartyForm({ type, initial, mode = "create" }) {
    const router = useRouter()
    const [form, setForm] = useState(() => ({
        ...EMPTY,
        ...Object.fromEntries(
            Object.entries(initial || {}).map(([k, v]) => [k, toFormValue(v)]),
        ),
    }))
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)

    function update(field) {
        return e => setForm(prev => ({ ...prev, [field]: e.target.value }))
    }

    async function handleSubmit(e) {
        e.preventDefault()
        setError("")
        setLoading(true)

        const payload = { ...form, type: mode === "create" ? type : undefined }
        const url =
            mode === "create"
                ? "/api/crm/counterparties"
                : `/api/crm/counterparties/${initial.id}`
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
        const id = data.item?.id || initial?.id
        router.push(`/crm/counterparties/${id}`)
        router.refresh()
    }

    return (
        <form onSubmit={handleSubmit} className='space-y-6'>
            <Section title='Основное'>
                <Field label='Название *' value={form.name} onChange={update("name")} required />
                <Field label='Регион *' value={form.region} onChange={update("region")} required />
                <Field label='Телефон' value={form.phone} onChange={update("phone")} />
                <Field
                    label='Email'
                    type='email'
                    value={form.email}
                    onChange={update("email")}
                />
                <Field
                    label='Адрес'
                    value={form.address}
                    onChange={update("address")}
                    className='sm:col-span-2'
                />
            </Section>

            <Section title='Реквизиты'>
                <Field label='ИНН' value={form.inn} onChange={update("inn")} />
                <Field label='КПП' value={form.kpp} onChange={update("kpp")} />
                <Field label='ОГРН' value={form.ogrn} onChange={update("ogrn")} />
                <Field label='ОКПО' value={form.okpo} onChange={update("okpo")} />
                <Field
                    label='ОКВЭД'
                    value={form.okved}
                    onChange={update("okved")}
                    className='sm:col-span-2'
                />
            </Section>

            <Section title='Банковские реквизиты'>
                <Field
                    label='Название банка'
                    value={form.bankName}
                    onChange={update("bankName")}
                    className='sm:col-span-2'
                />
                <Field label='БИК' value={form.bik} onChange={update("bik")} />
                <Field
                    label='Расчётный счёт'
                    value={form.bankAccount}
                    onChange={update("bankAccount")}
                />
                <Field
                    label='Корреспондентский счёт'
                    value={form.bankCorrAccount}
                    onChange={update("bankCorrAccount")}
                    className='sm:col-span-2'
                />
            </Section>

            <Section title='Финансы'>
                <Field
                    label='Бюджет (сумма сделок), ₽'
                    type='number'
                    step='0.01'
                    min='0'
                    inputMode='decimal'
                    value={form.totalRevenue}
                    onChange={update("totalRevenue")}
                />
                <Field
                    label='Скидка клиента, %'
                    type='number'
                    step='0.01'
                    min='0'
                    max='100'
                    inputMode='decimal'
                    value={form.discount}
                    onChange={update("discount")}
                />
            </Section>

            <div>
                <label className='mb-1 block text-sm text-gray-700'>Примечание</label>
                <textarea
                    rows={3}
                    value={form.note}
                    onChange={update("note")}
                    className='w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-primary_green focus:outline-none'
                />
            </div>

            {error && <p className='text-sm text-red-600'>{error}</p>}

            <div className='flex justify-end gap-3'>
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
