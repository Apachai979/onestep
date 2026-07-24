"use client"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import DadataSearch from "./DadataSearch"
import SearchableSelect from "./SearchableSelect"
import { Button } from "@/components/crm/ui"
import {
    ACTIVITY_AREAS,
    ACTIVITY_AREA_LABELS,
    COMPANY_KINDS,
    COMPANY_KIND_LABELS,
    COUNTERPARTY_SOURCES,
    COUNTERPARTY_SOURCE_LABELS,
    guessCompanyKind,
} from "@/lib/crm/counterparty"

const DADATA_PARTY_FIELDS = [
    "name",
    "inn",
    "kpp",
    "ogrn",
    "okpo",
    "okved",
    "region",
    "city",
    "address",
    "phone",
    "email",
]
const BIK_RE = /^\d{9}$/

const EMPTY = {
    name: "",
    region: "",
    city: "",
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
    source: "",
    companyKind: "",
    activityArea: "",
    note: "",
    managerId: "",
}

function toFormValue(v) {
    if (v === null || v === undefined) return ""
    if (typeof v === "object" && typeof v.toString === "function") return v.toString()
    return String(v)
}

export default function CounterpartyForm({ type, initial, mode = "create" }) {
    const router = useRouter()
    const effectiveType = mode === "edit" ? initial?.type : type
    const isEndCustomer = effectiveType === "END_CUSTOMER"
    const [form, setForm] = useState(() => ({
        ...EMPTY,
        ...Object.fromEntries(
            Object.entries(initial || {}).map(([k, v]) => [k, toFormValue(v)]),
        ),
    }))
    const [error, setError] = useState("")
    const [duplicate, setDuplicate] = useState(null)
    const [loading, setLoading] = useState(false)
    const [managers, setManagers] = useState([])

    useEffect(() => {
        fetch("/api/crm/users")
            .then(r => (r.ok ? r.json() : { items: [] }))
            .then(d => setManagers(d.items || []))
            .catch(() => setManagers([]))
    }, [])

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
            // Автоопределение типа медучреждения по ОКОПФ — только для
            // END_CUSTOMER и только если пользователь ещё не выбрал вручную.
            if (isEndCustomer && !next.companyKind) {
                const kind = guessCompanyKind(party.opfCode)
                if (kind) next.companyKind = kind
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
        setDuplicate(null)
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
            if (data.error === "counterparty_exists" && data.existing) {
                setDuplicate(data.existing)
                setError("")
            } else {
                const msg = data.error || `Не удалось сохранить (HTTP ${res.status})`
                console.error("[CounterpartyForm] save failed:", res.status, data)
                setError(msg)
            }
            setLoading(false)
            return
        }
        const data = await res.json()
        const id = data.item?.id || initial?.id
        router.push(`/crm/counterparties/${id}`)
        router.refresh()
    }

    return (
        <form onSubmit={handleSubmit} className='space-y-4'>
            <DadataSearch target='party' onPick={applyDadataParty} />

            <Section title='Основное'>
                <Field
                    label='Название *'
                    value={form.name}
                    onChange={update("name")}
                    required
                    className='lg:col-span-2'
                />
                <Field label='Регион *' value={form.region} onChange={update("region")} required />
                <Field label='Город' value={form.city} onChange={update("city")} />
                <Field label='Телефон' value={form.phone} onChange={update("phone")} />
                <Field
                    label='Email'
                    type='email'
                    value={form.email}
                    onChange={update("email")}
                />
                <div>
                    <label className='mb-1.5 block text-sm text-neutral-600'>
                        Ответственный менеджер
                    </label>
                    <SearchableSelect
                        value={form.managerId}
                        onChange={id => setForm(prev => ({ ...prev, managerId: id }))}
                        placeholder='— Не назначен —'
                        emptyLabel='Сотрудник не найден'
                        options={managers.map(m => ({
                            id: m.id,
                            label:
                                `${m.firstName ?? ""} ${m.lastName ?? ""}`.trim() || m.email,
                            search: `${m.firstName ?? ""} ${m.lastName ?? ""} ${m.email ?? ""}`,
                        }))}
                    />
                </div>
                <Field
                    label='Адрес'
                    value={form.address}
                    onChange={update("address")}
                    className='sm:col-span-2'
                />
                <div>
                    <label className='mb-1.5 block text-sm text-neutral-600'>Источник</label>
                    <select
                        value={form.source}
                        onChange={update("source")}
                        className='h-10 w-full rounded-xl border border-line bg-white px-3 text-sm text-neutral-900 shadow-sm transition-all duration-200 focus:border-brand_main focus:outline-none focus:ring-2 focus:ring-brand_main/20'
                    >
                        <option value=''>— не указан —</option>
                        {COUNTERPARTY_SOURCES.map(v => (
                            <option key={v} value={v}>
                                {COUNTERPARTY_SOURCE_LABELS[v]}
                            </option>
                        ))}
                    </select>
                </div>
                {isEndCustomer && (
                    <>
                        <div>
                            <label className='mb-1.5 block text-sm text-neutral-600'>
                                Тип компании
                            </label>
                            <select
                                value={form.companyKind}
                                onChange={update("companyKind")}
                                className='h-10 w-full rounded-xl border border-line bg-white px-3 text-sm text-neutral-900 shadow-sm transition-all duration-200 focus:border-brand_main focus:outline-none focus:ring-2 focus:ring-brand_main/20'
                            >
                                <option value=''>— не указан —</option>
                                {COMPANY_KINDS.map(v => (
                                    <option key={v} value={v}>
                                        {COMPANY_KIND_LABELS[v]}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className='mb-1.5 block text-sm text-neutral-600'>
                                Сфера деятельности
                            </label>
                            <select
                                value={form.activityArea}
                                onChange={update("activityArea")}
                                className='h-10 w-full rounded-xl border border-line bg-white px-3 text-sm text-neutral-900 shadow-sm transition-all duration-200 focus:border-brand_main focus:outline-none focus:ring-2 focus:ring-brand_main/20'
                            >
                                <option value=''>— не указана —</option>
                                {ACTIVITY_AREAS.map(v => (
                                    <option key={v} value={v}>
                                        {ACTIVITY_AREA_LABELS[v]}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </>
                )}
            </Section>

            <Section title='Реквизиты и финансы'>
                <Field label='ИНН' value={form.inn} onChange={update("inn")} />
                <Field label='КПП' value={form.kpp} onChange={update("kpp")} />
                <Field label='ОГРН' value={form.ogrn} onChange={update("ogrn")} />
                <Field label='ОКПО' value={form.okpo} onChange={update("okpo")} />
                <Field label='ОКВЭД' value={form.okved} onChange={update("okved")} />
                <Field
                    label='Название банка'
                    value={form.bankName}
                    onChange={update("bankName")}
                />
                <div>
                    <label className='mb-1.5 block text-sm text-neutral-600'>БИК</label>
                    <input
                        value={form.bik}
                        onChange={update("bik")}
                        inputMode='numeric'
                        placeholder='9 цифр — поиск автоматически'
                        className='h-10 w-full rounded-xl border border-line bg-white px-3 text-sm text-neutral-900 shadow-sm transition-all duration-200 placeholder:text-neutral-400 focus:border-brand_main focus:outline-none focus:ring-2 focus:ring-brand_main/20'
                    />
                    {bankLookup.status !== "idle" && (
                        <p
                            className={`mt-1 text-xs ${
                                bankLookup.status === "found"
                                    ? "text-brand_main"
                                    : bankLookup.status === "loading"
                                      ? "text-neutral-500"
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
                />
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
                <label className='mb-1.5 block text-sm text-neutral-600'>Примечание</label>
                <textarea
                    rows={3}
                    value={form.note}
                    onChange={update("note")}
                    className='w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm transition-all duration-200 placeholder:text-neutral-400 focus:border-brand_main focus:outline-none focus:ring-2 focus:ring-brand_main/20'
                />
            </div>

            {duplicate && (
                <div className='rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm'>
                    <p className='font-semibold text-amber-900'>
                        Контрагент с такой парой ИНН + КПП уже есть
                    </p>
                    <p className='mt-1 text-amber-900'>
                        «{duplicate.name}» —{" "}
                        {duplicate.type === "DISTRIBUTOR"
                            ? "Дистрибьютор"
                            : "Конечный потребитель"}
                    </p>
                    <p className='mt-1 text-xs text-amber-800'>
                        ИНН {duplicate.inn || "—"}
                        {duplicate.kpp ? ` · КПП ${duplicate.kpp}` : " · без КПП"}
                    </p>
                    <p className='mt-2 text-xs text-amber-800'>
                        Если это другой филиал того же юрлица — измените КПП, и сохранение
                        пройдёт.
                    </p>
                    <Link
                        href={`/crm/counterparties/${duplicate.id}`}
                        className='mt-2 inline-block font-semibold text-brand_main hover:underline'
                    >
                        Открыть карточку →
                    </Link>
                </div>
            )}

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
                    {mode === "create" ? "Создать" : "Сохранить"}
                </Button>
            </div>
        </form>
    )
}

function Section({ title, children }) {
    return (
        <section className='rounded-2xl border border-line bg-white p-6 shadow-sm'>
            <h2 className='mb-4 text-sm font-semibold text-neutral-900'>{title}</h2>
            <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>{children}</div>
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
