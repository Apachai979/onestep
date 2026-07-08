"use client"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { LuPlus, LuSearch, LuContact } from "react-icons/lu"
import {
    CardListSkeleton,
    CardRow,
    EmptyState,
    MobileCard,
    TableSkeleton,
    useToast,
} from "@/components/crm/ui"
import SearchableSelect from "./SearchableSelect"

const TYPE_LABELS = {
    DISTRIBUTOR: "Дистрибьютор",
    END_CUSTOMER: "Конечный потребитель",
}

const EMPTY = {
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    birthDate: "",
    position: "",
    isPrimary: false,
}

function safeJson(text) {
    try {
        return JSON.parse(text)
    } catch {
        return null
    }
}

function fullName(c) {
    return `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() || "Без имени"
}

export default function ContactsDirectory() {
    const router = useRouter()
    const toast = useToast()
    const [items, setItems] = useState(null)
    const [error, setError] = useState("")
    const [q, setQ] = useState("")

    const [counterparties, setCounterparties] = useState([])
    const [showForm, setShowForm] = useState(false)
    const [form, setForm] = useState(EMPTY)
    const [cpId, setCpId] = useState("")
    const [saving, setSaving] = useState(false)
    const [formError, setFormError] = useState("")

    // список контактов + поиск
    useEffect(() => {
        const controller = new AbortController()
        const params = new URLSearchParams()
        if (q.trim()) params.set("q", q.trim())
        setError("")
        fetch(`/api/crm/contacts?${params.toString()}`, { signal: controller.signal })
            .then(async r => {
                const text = await r.text()
                const data = text ? safeJson(text) : {}
                if (!r.ok) throw new Error(data?.error || `Ошибка ${r.status}`)
                return data
            })
            .then(data => setItems(data.items || []))
            .catch(err => {
                if (err.name === "AbortError") return
                setError(err.message)
                setItems([])
            })
        return () => controller.abort()
    }, [q])

    // контрагенты для привязки
    useEffect(() => {
        fetch("/api/crm/counterparties")
            .then(r => r.json())
            .then(d => setCounterparties(d.items || []))
            .catch(() => {})
    }, [])

    function reloadContacts() {
        const params = new URLSearchParams()
        if (q.trim()) params.set("q", q.trim())
        fetch(`/api/crm/contacts?${params.toString()}`)
            .then(r => r.json())
            .then(d => setItems(d.items || []))
            .catch(() => {})
    }

    function update(field) {
        return e => {
            const v = e.target.type === "checkbox" ? e.target.checked : e.target.value
            setForm(prev => ({ ...prev, [field]: v }))
        }
    }

    function openForm() {
        setForm(EMPTY)
        setCpId("")
        setFormError("")
        setShowForm(true)
    }

    function closeForm() {
        setShowForm(false)
        setFormError("")
    }

    async function handleCreate(e) {
        e.preventDefault()
        setFormError("")
        setSaving(true)
        const res = await fetch(`/api/crm/contacts`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...form, counterpartyId: cpId || null }),
        })
        if (!res.ok) {
            const data = await res.json().catch(() => ({}))
            setFormError(data.error || "Не удалось сохранить контакт")
            setSaving(false)
            return
        }
        setSaving(false)
        closeForm()
        toast.success("Контакт добавлен")
        reloadContacts()
    }

    const cpOptions = counterparties.map(c => ({
        id: c.id,
        label: c.name,
        sublabel: `${TYPE_LABELS[c.type] || c.type}${c.region ? ` · ${c.region}` : ""}${
            c.inn ? ` · ИНН ${c.inn}` : ""
        }`,
        search: `${c.name} ${c.inn ?? ""} ${c.region ?? ""}`,
    }))

    return (
        <div className='space-y-4'>
            <div className='flex flex-wrap items-end gap-3 rounded-xl border border-brand_soft/40 bg-white/70 p-4'>
                <div className='min-w-[220px] flex-1'>
                    <label className='mb-1 block text-xs text-night_green/65'>Поиск</label>
                    <div className='relative'>
                        <LuSearch className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-night_green/40' />
                        <input
                            value={q}
                            onChange={e => setQ(e.target.value)}
                            placeholder='Имя, телефон, email, должность, контрагент'
                            className='w-full rounded-lg border border-brand_soft/60 bg-white py-2 pl-9 pr-3 text-sm shadow-sm focus:border-brand_main focus:outline-none'
                        />
                    </div>
                </div>
                {!showForm && (
                    <button
                        type='button'
                        onClick={openForm}
                        className='inline-flex items-center gap-2 rounded-lg bg-brand_main px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand_main/90'
                    >
                        <LuPlus className='h-4 w-4' />
                        Добавить контакт
                    </button>
                )}
            </div>

            {showForm && (
                <form
                    onSubmit={handleCreate}
                    className='space-y-3 rounded-xl border border-dashed border-primary_green/50 bg-white/70 p-4'
                >
                    <h2 className='text-sm font-semibold uppercase tracking-wide text-night_green/70'>
                        Новый контакт
                    </h2>
                    <div>
                        <label className='mb-1 block text-xs text-night_green/65'>Контрагент</label>
                        <SearchableSelect
                            value={cpId}
                            onChange={setCpId}
                            placeholder='— Без привязки —'
                            emptyLabel='Контрагент не найден'
                            options={cpOptions}
                        />
                        <p className='mt-1 text-xs text-night_green/55'>
                            Необязательно. Нужного контрагента нет? Создайте его в разделах{" "}
                            <Link href='/crm/distributors' className='text-brand_main hover:underline'>
                                «Дистрибьюторы»
                            </Link>{" "}
                            или{" "}
                            <Link href='/crm/customers' className='text-brand_main hover:underline'>
                                «Конечные потребители»
                            </Link>
                            .
                        </p>
                    </div>
                    <div className='grid gap-3 sm:grid-cols-2'>
                        <Field label='Имя' value={form.firstName} onChange={update("firstName")} />
                        <Field
                            label='Фамилия'
                            value={form.lastName}
                            onChange={update("lastName")}
                        />
                        <Field
                            label='Телефон *'
                            required
                            value={form.phone}
                            onChange={update("phone")}
                        />
                        <Field
                            label='Email'
                            type='email'
                            value={form.email}
                            onChange={update("email")}
                        />
                        <Field
                            label='Дата рождения'
                            type='date'
                            value={form.birthDate}
                            onChange={update("birthDate")}
                        />
                        <Field
                            label='Должность'
                            value={form.position}
                            onChange={update("position")}
                        />
                    </div>
                    <label
                        className={`flex items-center gap-2 text-sm ${
                            cpId ? "text-night_green/80" : "text-night_green/40"
                        }`}
                    >
                        <input
                            type='checkbox'
                            checked={form.isPrimary && !!cpId}
                            disabled={!cpId}
                            onChange={update("isPrimary")}
                        />
                        Основной контакт контрагента
                    </label>
                    {formError && <p className='text-sm text-red-600'>{formError}</p>}
                    <div className='flex justify-end gap-2'>
                        <button
                            type='button'
                            onClick={closeForm}
                            className='rounded-lg border border-brand_soft/60 px-3 py-1.5 text-sm text-night_green/80 hover:bg-brand_soft/30'
                        >
                            Отмена
                        </button>
                        <button
                            type='submit'
                            disabled={saving}
                            className='rounded-lg bg-brand_main px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand_main/90 disabled:cursor-not-allowed disabled:opacity-60'
                        >
                            {saving ? "Сохраняем..." : "Добавить"}
                        </button>
                    </div>
                </form>
            )}

            {error && (
                <p className='rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700'>
                    {error}
                </p>
            )}

            {/* Мобильные карточки */}
            <div className='space-y-3 md:hidden'>
                {items === null && <CardListSkeleton />}
                {items?.length === 0 && (
                    <EmptyState
                        icon={LuContact}
                        title='Контактов не найдено'
                        hint='Измените запрос или добавьте контакт.'
                    />
                )}
                {items?.map(c => (
                    <MobileCard key={c.id} onClick={() => router.push(`/crm/contacts/${c.id}`)}>
                        <div className='flex items-start justify-between gap-2'>
                            <Link
                                href={`/crm/contacts/${c.id}`}
                                className='font-medium text-night_green hover:text-brand_main'
                            >
                                {fullName(c)}
                            </Link>
                            {c.isPrimary && (
                                <span className='shrink-0 rounded-full bg-light_green/30 px-2 py-0.5 text-xs font-medium text-night_green'>
                                    Основной
                                </span>
                            )}
                        </div>
                        <div className='mt-2 space-y-1'>
                            {c.position && <CardRow label='Должность'>{c.position}</CardRow>}
                            <CardRow label='Телефон'>{c.phone || "—"}</CardRow>
                            <CardRow label='Email'>{c.email || "—"}</CardRow>
                            <CardRow label='Контрагент'>
                                {c.counterparty ? (
                                    <Link
                                        href={`/crm/counterparties/${c.counterparty.id}`}
                                        onClick={e => e.stopPropagation()}
                                        className='text-brand_main hover:underline'
                                    >
                                        {c.counterparty.name}
                                    </Link>
                                ) : (
                                    "—"
                                )}
                            </CardRow>
                        </div>
                    </MobileCard>
                ))}
            </div>

            {/* Десктоп-таблица */}
            <div className='hidden overflow-x-auto rounded-xl border border-brand_soft/40 bg-white/70 md:block'>
                <table className='w-full text-sm'>
                    <thead className='sticky top-0 z-10 bg-brand_soft/30 text-left text-xs uppercase tracking-wider text-night_green/70 backdrop-blur'>
                        <tr>
                            <th className='px-4 py-3'>ФИО</th>
                            <th className='px-4 py-3'>Должность</th>
                            <th className='px-4 py-3'>Телефон</th>
                            <th className='px-4 py-3'>Email</th>
                            <th className='px-4 py-3'>Контрагент</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items === null && <TableSkeleton rows={5} cols={5} />}
                        {items?.length === 0 && (
                            <EmptyState
                                colSpan={5}
                                icon={LuContact}
                                title='Контактов не найдено'
                                hint='Измените запрос или добавьте контакт.'
                            />
                        )}
                        {items?.map(c => (
                            <tr
                                key={c.id}
                                onClick={() => router.push(`/crm/contacts/${c.id}`)}
                                className='cursor-pointer border-t border-brand_soft/30 transition hover:bg-brand_soft/15'
                            >
                                <td className='px-4 py-3'>
                                    <span className='inline-flex flex-wrap items-center gap-2'>
                                        <Link
                                            href={`/crm/contacts/${c.id}`}
                                            className='font-medium text-night_green hover:text-brand_main'
                                        >
                                            {fullName(c)}
                                        </Link>
                                        {c.isPrimary && (
                                            <span className='rounded-full bg-light_green/30 px-2 py-0.5 text-[10px] font-medium text-night_green'>
                                                Основной
                                            </span>
                                        )}
                                    </span>
                                </td>
                                <td className='px-4 py-3 text-gray-700'>{c.position || "—"}</td>
                                <td className='px-4 py-3 text-gray-700'>{c.phone || "—"}</td>
                                <td className='px-4 py-3 text-gray-700'>{c.email || "—"}</td>
                                <td className='px-4 py-3'>
                                    {c.counterparty ? (
                                        <Link
                                            href={`/crm/counterparties/${c.counterparty.id}`}
                                            onClick={e => e.stopPropagation()}
                                            className='text-brand_main hover:underline'
                                        >
                                            {c.counterparty.name}
                                        </Link>
                                    ) : (
                                        "—"
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

function Field({ label, ...props }) {
    return (
        <div>
            <label className='mb-1 block text-xs text-night_green/65'>{label}</label>
            <input
                {...props}
                className='w-full rounded-lg border border-brand_soft/60 px-3 py-2 text-sm shadow-sm focus:border-brand_main focus:outline-none'
            />
        </div>
    )
}
