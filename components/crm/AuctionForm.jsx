"use client"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Button, useToast } from "@/components/crm/ui"

function contactName(c) {
    const fn = `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim()
    return fn || c.email || c.phone || "Контакт без имени"
}

function managerName(u) {
    return `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email
}

// ISO (UTC) → значение для <input type="datetime-local"> в местном времени.
function isoToLocalInput(iso) {
    if (!iso) return ""
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ""
    const pad = n => String(n).padStart(2, "0")
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// Местное значение datetime-local → ISO: new Date() в браузере трактует
// строку без TZ как местное время — то, что нужно.
function localInputToIso(v) {
    if (!v) return null
    const d = new Date(v)
    return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

function toFormValue(v) {
    if (v === null || v === undefined) return ""
    if (typeof v === "object" && typeof v.toString === "function") return v.toString()
    return String(v)
}

export default function AuctionForm({ mode = "create", project, initial, currentUserId }) {
    const router = useRouter()
    const toast = useToast()

    // Заказчик/поставщик фиксированы проектом (конечный потребитель и
    // дистрибьютор) — в форме только отображаются.
    const customer = mode === "create" ? project.endCustomer : initial.customer
    const supplier = mode === "create" ? project.distributor : initial.supplier

    const [form, setForm] = useState(() => ({
        purchaseNumber: initial?.purchaseNumber ?? "",
        auctionUrl: initial?.auctionUrl ?? "",
        supplierContactId: initial?.supplierContactId ?? "",
        nmck: toFormValue(initial?.nmck) === "0" ? "" : toFormValue(initial?.nmck),
        bidsDeadlineAt: isoToLocalInput(initial?.bidsDeadlineAt),
        auctionAt: isoToLocalInput(initial?.auctionAt),
        resultsAt: isoToLocalInput(initial?.resultsAt),
        managerId: initial?.managerId ?? project?.managerId ?? currentUserId ?? "",
        participantsCount: toFormValue(initial?.participantsCount),
        bidsCount: toFormValue(initial?.bidsCount),
        winner: initial?.winner ?? "",
    }))
    const [contacts, setContacts] = useState([])
    const [managers, setManagers] = useState([])
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        fetch("/api/crm/users")
            .then(r => r.json())
            .then(d => setManagers(d.items || []))
            .catch(() => {})
    }, [])

    // Контакты поставщика — для выбора контактного лица.
    useEffect(() => {
        if (!supplier?.id) return
        fetch(`/api/crm/counterparties/${supplier.id}`)
            .then(r => r.json())
            .then(d => setContacts(d.item?.contacts || []))
            .catch(() => setContacts([]))
    }, [supplier?.id])

    function update(field) {
        return e => setForm(prev => ({ ...prev, [field]: e.target.value }))
    }

    async function handleSubmit(e) {
        e.preventDefault()
        setError("")
        setLoading(true)

        const payload = {
            purchaseNumber: form.purchaseNumber,
            auctionUrl: form.auctionUrl,
            supplierContactId: form.supplierContactId || null,
            nmck: form.nmck,
            bidsDeadlineAt: localInputToIso(form.bidsDeadlineAt),
            auctionAt: localInputToIso(form.auctionAt),
            resultsAt: localInputToIso(form.resultsAt),
            managerId: form.managerId,
            participantsCount: form.participantsCount,
            bidsCount: form.bidsCount,
            winner: form.winner,
        }
        if (mode === "create") {
            payload.projectId = project.id
            payload.customerId = project.endCustomerId
            payload.supplierId = project.distributorId
        }

        const url = mode === "create" ? "/api/crm/auctions" : `/api/crm/auctions/${initial.id}`
        const res = await fetch(url, {
            method: mode === "create" ? "POST" : "PATCH",
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
        toast.success(mode === "create" ? "Аукцион создан" : "Аукцион сохранён")
        router.push(`/crm/auctions/${data.item?.id || initial?.id}`)
        router.refresh()
    }

    return (
        <form onSubmit={handleSubmit} className='space-y-4'>
            <Section title='Закупка'>
                <Field
                    label='Номер закупки'
                    value={form.purchaseNumber}
                    onChange={update("purchaseNumber")}
                    placeholder='Например: 0365200004425000012'
                />
                <Field
                    label='Ссылка на аукцион'
                    type='url'
                    value={form.auctionUrl}
                    onChange={update("auctionUrl")}
                    placeholder='https://zakupki.gov.ru/...'
                />
                <Field
                    label='НМЦК, ₽'
                    type='number'
                    step='0.01'
                    min='0'
                    inputMode='decimal'
                    value={form.nmck}
                    onChange={update("nmck")}
                />
                <div>
                    <label className='mb-1.5 block text-sm text-neutral-600'>
                        Ответственный менеджер *
                    </label>
                    <select
                        value={form.managerId}
                        onChange={update("managerId")}
                        required
                        className='h-10 w-full rounded-xl border border-line bg-white px-3 text-sm text-neutral-900 shadow-sm transition-all duration-200 focus:border-brand_main focus:outline-none focus:ring-2 focus:ring-brand_main/20'
                    >
                        <option value=''>— Выберите —</option>
                        {managers.map(m => (
                            <option key={m.id} value={m.id}>
                                {managerName(m)}
                            </option>
                        ))}
                    </select>
                </div>
            </Section>

            <Section title='Стороны'>
                <ReadOnly label='Заказчик (конечный потребитель проекта)' value={customer?.name} />
                <ReadOnly label='Поставщик (дистрибьютор проекта)' value={supplier?.name} />
                <div className='sm:col-span-2'>
                    <label className='mb-1.5 block text-sm text-neutral-600'>Контакт поставщика</label>
                    <select
                        value={form.supplierContactId}
                        onChange={update("supplierContactId")}
                        className='h-10 w-full rounded-xl border border-line bg-white px-3 text-sm text-neutral-900 shadow-sm transition-all duration-200 focus:border-brand_main focus:outline-none focus:ring-2 focus:ring-brand_main/20'
                    >
                        <option value=''>
                            {contacts.length === 0 ? "У поставщика нет контактов" : "— Не выбран —"}
                        </option>
                        {contacts.map(c => (
                            <option key={c.id} value={c.id}>
                                {contactName(c)}
                                {c.position ? ` · ${c.position}` : ""}
                            </option>
                        ))}
                    </select>
                </div>
            </Section>

            <Section title='Сроки (местное время)'>
                <Field
                    label='Окончание сбора заявок'
                    type='datetime-local'
                    value={form.bidsDeadlineAt}
                    onChange={update("bidsDeadlineAt")}
                />
                <Field
                    label='Проведение аукциона'
                    type='datetime-local'
                    value={form.auctionAt}
                    onChange={update("auctionAt")}
                />
                <Field
                    label='Подведение итогов'
                    type='datetime-local'
                    value={form.resultsAt}
                    onChange={update("resultsAt")}
                />
            </Section>

            <Section title='Результаты'>
                <Field
                    label='Количество заявок'
                    type='number'
                    min='0'
                    step='1'
                    value={form.bidsCount}
                    onChange={update("bidsCount")}
                />
                <Field
                    label='Количество участников'
                    type='number'
                    min='0'
                    step='1'
                    value={form.participantsCount}
                    onChange={update("participantsCount")}
                />
                <Field
                    label='Победитель'
                    value={form.winner}
                    onChange={update("winner")}
                    placeholder='Название организации-победителя'
                    className='sm:col-span-2'
                />
            </Section>

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

function ReadOnly({ label, value }) {
    return (
        <div>
            <label className='mb-1.5 block text-sm text-neutral-600'>{label}</label>
            <p className='flex h-10 items-center rounded-xl border border-line bg-surface_muted px-3 text-sm text-neutral-800'>
                {value || "—"}
            </p>
        </div>
    )
}
