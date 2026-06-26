"use client"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import DadataSearch from "./DadataSearch"

const DADATA_PARTY_FIELDS = ["name", "inn", "kpp", "ogrn", "okpo", "okved", "region", "address"]
const BIK_RE = /^\d{9}$/

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

    function applyDadataParty(party) {
        setForm(prev => {
            const next = { ...prev }
            for (const f of DADATA_PARTY_FIELDS) {
                if (party[f] !== undefined && party[f] !== null && party[f] !== "") {
                    next[f] = party[f]
                }
            }
            return next
        })
    }

    const [bankLookup, setBankLookup] = useState({ status: "idle", message: "" })
    const lastBikRef = useRef("")

    useEffect(() => {
        const bik = form.bik.trim()
        if (!BIK_RE.test(bik)) {
            lastBikRef.current = bik
            setBankLookup({ status: "idle", message: "" })
            return
        }
        if (bik === lastBikRef.current) return
        lastBikRef.current = bik

        const controller = new AbortController()
        setBankLookup({ status: "loading", message: "Ищем банк..." })

        fetch("/api/crm/dadata/find-bank", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: bik }),
            signal: controller.signal,
        })
            .then(async r => {
                const data = await r.json().catch(() => ({}))
                if (!r.ok) throw new Error(data.error || "Ошибка поиска банка")
                return data.items || []
            })
            .then(items => {
                const bank = items[0]
                if (!bank) {
                    setBankLookup({ status: "not-found", message: "Банк не найден" })
                    return
                }
                setForm(prev => ({
                    ...prev,
                    bankName: bank.name || prev.bankName,
                    bankCorrAccount: bank.bankCorrAccount || prev.bankCorrAccount,
                }))
                setBankLookup({
                    status: "found",
                    message: `Подставлено: ${bank.name}`,
                })
            })
            .catch(err => {
                if (err.name === "AbortError") return
                setBankLookup({ status: "error", message: err.message || "Ошибка" })
            })

        return () => controller.abort()
    }, [form.bik])

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
            <DadataSearch target='party' onPick={applyDadataParty} />

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
                <div>
                    <label className='mb-1 block text-sm text-gray-700'>БИК</label>
                    <input
                        value={form.bik}
                        onChange={update("bik")}
                        inputMode='numeric'
                        placeholder='9 цифр — поиск автоматически'
                        className='w-full rounded-lg border border-brand_soft/60 px-3 py-2 shadow-sm focus:border-brand_main focus:outline-none'
                    />
                    {bankLookup.status !== "idle" && (
                        <p
                            className={`mt-1 text-xs ${
                                bankLookup.status === "found"
                                    ? "text-primary_green"
                                    : bankLookup.status === "loading"
                                      ? "text-gray-500"
                                      : "text-red-600"
                            }`}
                        >
                            {bankLookup.message}
                        </p>
                    )}
                </div>
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
                    className='w-full rounded-lg border border-brand_soft/60 px-3 py-2 shadow-sm focus:border-brand_main focus:outline-none'
                />
            </div>

            {error && <p className='text-sm text-red-600'>{error}</p>}

            <div className='flex justify-end gap-3'>
                <button
                    type='button'
                    onClick={() => router.back()}
                    className='rounded-lg border border-brand_soft/60 px-4 py-2 text-sm text-gray-700 hover:bg-brand_soft/30'
                >
                    Отмена
                </button>
                <button
                    type='submit'
                    disabled={loading}
                    className='rounded-lg bg-brand_main px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand_main/90 disabled:cursor-not-allowed disabled:opacity-60'
                >
                    {loading ? "Сохраняем..." : mode === "create" ? "Создать" : "Сохранить"}
                </button>
            </div>
        </form>
    )
}

function Section({ title, children }) {
    return (
        <section className='rounded-xl border border-brand_soft/40 bg-white/70 p-5'>
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
                className='w-full rounded-lg border border-brand_soft/60 px-3 py-2 shadow-sm focus:border-brand_main focus:outline-none'
            />
        </div>
    )
}
