"use client"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { DEAL_STATUSES, DEAL_STATUS_LABELS } from "@/lib/crm/deal"
import SearchableSelect from "./SearchableSelect"

const EMPTY = {
    title: "",
    counterpartyId: "",
    contactId: "",
    managerId: "",
    status: "NEGOTIATION",
    sourceProjectId: "",
    note: "",
    deliveryAddress: "",
    discount: "",
}

function safeJson(text) {
    try {
        return JSON.parse(text)
    } catch {
        return null
    }
}

function managerName(u) {
    return `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email
}

function contactName(c) {
    const fn = `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim()
    return fn || c.email || c.phone || "Контакт без имени"
}

export default function DealForm({
    initial,
    mode = "create",
    currentUserId,
    defaultStatus,
    fromProject,
}) {
    const router = useRouter()

    const [form, setForm] = useState(() => {
        if (!initial) {
            const base = {
                ...EMPTY,
                managerId: currentUserId || "",
                status: defaultStatus || "NEGOTIATION",
            }
            if (fromProject) {
                base.title = `По проекту: ${fromProject.internalName}`
                base.counterpartyId = fromProject.distributorId
                base.managerId = fromProject.managerId || currentUserId || ""
                base.sourceProjectId = fromProject.id
            }
            return base
        }
        return {
            title: initial.title ?? "",
            counterpartyId: initial.counterpartyId ?? "",
            contactId: initial.contactId ?? "",
            managerId: initial.managerId ?? "",
            status: initial.status ?? "NEGOTIATION",
            sourceProjectId: initial.sourceProjectId ?? "",
            note: initial.note ?? "",
            deliveryAddress: initial.deliveryAddress ?? "",
            discount:
                initial.discount === null || initial.discount === undefined
                    ? ""
                    : String(initial.discount),
        }
    })
    const [counterparties, setCounterparties] = useState([])
    const [managers, setManagers] = useState([])
    const [contacts, setContacts] = useState([])
    const [projects, setProjects] = useState([])
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        Promise.all([
            fetch("/api/crm/counterparties").then(r => r.json()),
            fetch("/api/crm/users").then(r => r.json()),
            fetch("/api/crm/projects").then(r => r.json()),
        ])
            .then(([c, u, p]) => {
                setCounterparties(c.items || [])
                setManagers(u.items || [])
                setProjects(p.items || [])
            })
            .catch(() => {})
    }, [])

    useEffect(() => {
        if (!form.counterpartyId) {
            setContacts([])
            return
        }
        fetch(`/api/crm/counterparties/${form.counterpartyId}`)
            .then(r => r.json())
            .then(d => {
                setContacts(d.item?.contacts || [])
                // Если у сделки скидка ещё не задана — подтягиваем из контрагента.
                const cpDiscount = d.item?.discount
                if (cpDiscount !== null && cpDiscount !== undefined) {
                    setForm(prev => {
                        if (prev.discount !== "") return prev
                        return { ...prev, discount: String(cpDiscount) }
                    })
                }
            })
            .catch(() => setContacts([]))
    }, [form.counterpartyId])

    function update(field) {
        return e => setForm(prev => ({ ...prev, [field]: e.target.value }))
    }

    const counterpartyOptions = useMemo(
        () =>
            counterparties.map(c => ({
                id: c.id,
                label: c.name,
                sublabel: `${c.type === "DISTRIBUTOR" ? "Дистрибьютор" : "Конечный потребитель"}${
                    c.inn ? ` · ИНН ${c.inn}` : ""
                }${c.region ? ` · ${c.region}` : ""}`,
                search: `${c.name} ${c.inn ?? ""} ${c.region ?? ""}`,
            })),
        [counterparties]
    )

    async function handleSubmit(e) {
        e.preventDefault()
        setError("")
        setLoading(true)

        const payload = {
            ...form,
            contactId: form.contactId || null,
            sourceProjectId: form.sourceProjectId || null,
        }
        const url = mode === "create" ? "/api/crm/deals" : `/api/crm/deals/${initial.id}`
        const method = mode === "create" ? "POST" : "PATCH"

        const res = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        })

        if (!res.ok) {
            const text = await res.text()
            const data = text ? safeJson(text) : {}
            setError(data?.error || "Не удалось сохранить")
            setLoading(false)
            return
        }
        const data = await res.json()
        router.push(`/crm/deals/${data.item?.id || initial?.id}`)
        router.refresh()
    }

    return (
        <form onSubmit={handleSubmit} className='space-y-4'>
            <Section title='Основное'>
                <Field
                    label='Название сделки (опц.)'
                    value={form.title}
                    onChange={update("title")}
                    placeholder='Если пусто — будет «Сделка с {клиент}»'
                    className='sm:col-span-2'
                />
                <div className='sm:col-span-2'>
                    <label className='mb-1 block text-sm text-gray-700'>Клиент *</label>
                    <SearchableSelect
                        value={form.counterpartyId}
                        onChange={id =>
                            setForm(prev => ({ ...prev, counterpartyId: id, contactId: "" }))
                        }
                        required
                        placeholder='Введите название или ИНН'
                        options={counterpartyOptions}
                    />
                </div>
                <div>
                    <label className='mb-1 block text-sm text-gray-700'>Контактное лицо</label>
                    <SearchableSelect
                        value={form.contactId}
                        onChange={id => setForm(prev => ({ ...prev, contactId: id }))}
                        disabled={!form.counterpartyId}
                        placeholder={
                            !form.counterpartyId
                                ? "Сначала выберите клиента"
                                : contacts.length === 0
                                  ? "У клиента нет контактов"
                                  : "— Не выбран —"
                        }
                        options={contacts.map(c => ({
                            id: c.id,
                            label: contactName(c),
                            search: `${c.firstName ?? ""} ${c.lastName ?? ""} ${c.email ?? ""} ${c.phone ?? ""}`,
                        }))}
                    />
                </div>
                <div>
                    <label className='mb-1 block text-sm text-gray-700'>
                        Ответственный менеджер *
                    </label>
                    <SearchableSelect
                        value={form.managerId}
                        onChange={id => setForm(prev => ({ ...prev, managerId: id }))}
                        required
                        options={managers.map(m => ({
                            id: m.id,
                            label: managerName(m),
                            search: `${m.firstName ?? ""} ${m.lastName ?? ""} ${m.email ?? ""}`,
                        }))}
                    />
                </div>
                <div className='sm:col-span-2'>
                    <label className='mb-1 block text-sm text-gray-700'>Проект-источник</label>
                    <SearchableSelect
                        value={form.sourceProjectId}
                        onChange={id => setForm(prev => ({ ...prev, sourceProjectId: id }))}
                        placeholder='— Без привязки —'
                        emptyLabel='Проект не найден'
                        options={projects.map(p => ({
                            id: p.id,
                            label: p.internalName,
                            sublabel: `Аукцион ${p.externalAuctionId}${
                                p.endCustomer?.name ? ` · ${p.endCustomer.name}` : ""
                            }`,
                            search: `${p.internalName} ${p.externalAuctionId} ${p.distributor?.name ?? ""} ${p.endCustomer?.name ?? ""}`,
                        }))}
                    />
                </div>
            </Section>

            <Section title='Статус, доставка, примечание'>
                <div>
                    <label className='mb-1 block text-sm text-gray-700'>Статус</label>
                    <select
                        value={form.status}
                        onChange={update("status")}
                        className='w-full rounded-lg border border-brand_soft/60 bg-white px-3 py-2 shadow-sm focus:border-brand_main focus:outline-none'
                    >
                        {DEAL_STATUSES.map(s => (
                            <option key={s} value={s}>
                                {DEAL_STATUS_LABELS[s]}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className='mb-1 block text-sm text-gray-700'>
                        Скидка, %
                    </label>
                    <input
                        type='number'
                        min='0'
                        max='100'
                        step='0.01'
                        inputMode='decimal'
                        value={form.discount}
                        onChange={update("discount")}
                        placeholder='Подтянется из карточки клиента'
                        className='w-full rounded-lg border border-brand_soft/60 px-3 py-2 shadow-sm focus:border-brand_main focus:outline-none'
                    />
                    <p className='mt-1 text-xs text-night_green/55'>
                        Используется в КП. Меняйте здесь, если клиенту согласована особая
                        скидка на эту сделку.
                    </p>
                </div>
                <div className='sm:col-span-2'>
                    <label className='mb-1 block text-sm text-gray-700'>
                        Адрес доставки
                    </label>
                    <textarea
                        rows={2}
                        value={form.deliveryAddress}
                        onChange={update("deliveryAddress")}
                        placeholder='По умолчанию для новых отгрузок этой сделки'
                        className='w-full rounded-lg border border-brand_soft/60 px-3 py-2 shadow-sm focus:border-brand_main focus:outline-none'
                    />
                    <p className='mt-1 text-xs text-night_green/55'>
                        Подставится в форму новой отгрузки. Уже созданные отгрузки не меняются.
                    </p>
                </div>
                <div className='sm:col-span-2'>
                    <label className='mb-1 block text-sm text-gray-700'>Примечание</label>
                    <textarea
                        rows={3}
                        value={form.note}
                        onChange={update("note")}
                        className='w-full rounded-lg border border-brand_soft/60 px-3 py-2 shadow-sm focus:border-brand_main focus:outline-none'
                    />
                </div>
            </Section>

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
        <section className='rounded-xl border border-brand_soft/40 bg-white/70 p-4'>
            <h2 className='mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500'>
                {title}
            </h2>
            <div className='grid gap-3 sm:grid-cols-2'>{children}</div>
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
