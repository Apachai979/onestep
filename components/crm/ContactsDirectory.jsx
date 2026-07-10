"use client"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { LuPlus, LuSearch, LuContact } from "react-icons/lu"
import {
    Badge,
    Button,
    CardListSkeleton,
    CardRow,
    DataTable,
    EmptyState,
    Field as UiField,
    Input,
    MobileCard,
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

    const columns = useMemo(
        () => [
            {
                key: "name",
                header: "ФИО",
                sortable: true,
                sortValue: c => fullName(c),
                render: c => (
                    <span className='inline-flex flex-wrap items-center gap-2'>
                        <Link
                            href={`/crm/contacts/${c.id}`}
                            onClick={e => e.stopPropagation()}
                            className='font-medium text-neutral-900 hover:text-brand_main'
                        >
                            {fullName(c)}
                        </Link>
                        {c.isPrimary && (
                            <Badge tone='brand' size='sm'>
                                Основной
                            </Badge>
                        )}
                    </span>
                ),
            },
            {
                key: "position",
                header: "Должность",
                render: c => c.position || "—",
                hideable: true,
            },
            {
                key: "phone",
                header: "Телефон",
                render: c => c.phone || "—",
            },
            {
                key: "email",
                header: "Email",
                render: c => c.email || "—",
                hideable: true,
            },
            {
                key: "counterparty",
                header: "Контрагент",
                sortValue: c => c.counterparty?.name || "",
                render: c =>
                    c.counterparty ? (
                        <Link
                            href={`/crm/counterparties/${c.counterparty.id}`}
                            onClick={e => e.stopPropagation()}
                            className='text-brand_main hover:underline'
                        >
                            {c.counterparty.name}
                        </Link>
                    ) : (
                        "—"
                    ),
            },
        ],
        [],
    )

    return (
        <div className='space-y-4'>
            <div className='flex flex-wrap items-end gap-3 rounded-2xl border border-line bg-white p-4 shadow-sm'>
                <UiField label='Поиск' className='min-w-[220px] flex-1'>
                    <Input
                        icon={LuSearch}
                        value={q}
                        onChange={e => setQ(e.target.value)}
                        placeholder='Имя, телефон, email, должность, контрагент'
                    />
                </UiField>
                {!showForm && (
                    <Button type='button' onClick={openForm}>
                        <LuPlus className='h-4 w-4' />
                        Добавить контакт
                    </Button>
                )}
            </div>

            {showForm && (
                <form
                    onSubmit={handleCreate}
                    className='space-y-3 rounded-xl border border-dashed border-brand_main/40 bg-surface_muted p-4'
                >
                    <h2 className='text-sm font-semibold uppercase tracking-wide text-neutral-500'>
                        Новый контакт
                    </h2>
                    <div>
                        <label className='mb-1 block text-xs text-neutral-500'>Контрагент</label>
                        <SearchableSelect
                            value={cpId}
                            onChange={setCpId}
                            placeholder='— Без привязки —'
                            emptyLabel='Контрагент не найден'
                            options={cpOptions}
                        />
                        <p className='mt-1 text-xs text-neutral-400'>
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
                            cpId ? "text-neutral-700" : "text-neutral-400"
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
                            className='rounded-lg border border-line px-3 py-1.5 text-sm text-neutral-700 hover:bg-surface_muted'
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
                                className='font-medium text-neutral-900 hover:text-brand_main'
                            >
                                {fullName(c)}
                            </Link>
                            {c.isPrimary && (
                                <span className='shrink-0 rounded-full bg-brand_main/10 px-2 py-0.5 text-xs font-medium text-brand_main'>
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
            <div className='hidden md:block'>
                <DataTable
                    columns={columns}
                    rows={items || []}
                    loading={items === null}
                    getRowId={c => c.id}
                    onRowClick={c => router.push(`/crm/contacts/${c.id}`)}
                    initialSort={{ key: "name", dir: "asc" }}
                    empty={
                        <EmptyState
                            icon={LuContact}
                            title='Контактов не найдено'
                            hint='Измените запрос или добавьте контакт.'
                        />
                    }
                />
            </div>
        </div>
    )
}

function Field({ label, ...props }) {
    return (
        <div>
            <label className='mb-1 block text-xs font-medium text-neutral-500'>{label}</label>
            <input
                {...props}
                className='h-10 w-full rounded-xl border border-line bg-white px-3 text-sm text-neutral-900 shadow-sm transition-all duration-200 placeholder:text-neutral-400 focus:border-brand_main focus:outline-none focus:ring-2 focus:ring-brand_main/20'
            />
        </div>
    )
}
