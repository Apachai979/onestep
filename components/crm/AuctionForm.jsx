"use client"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useToast } from "@/components/crm/ui"

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
                    <label className='mb-1 block text-sm text-gray-700'>
                        Ответственный менеджер *
                    </label>
                    <select
                        value={form.managerId}
                        onChange={update("managerId")}
                        required
                        className='w-full rounded-lg border border-brand_soft/60 bg-white px-3 py-2 shadow-sm focus:border-brand_main focus:outline-none'
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
                    <label className='mb-1 block text-sm text-gray-700'>Контакт поставщика</label>
                    <select
                        value={form.supplierContactId}
                        onChange={update("supplierContactId")}
                        className='w-full rounded-lg border border-brand_soft/60 bg-white px-3 py-2 shadow-sm focus:border-brand_main focus:outline-none'
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

function ReadOnly({ label, value }) {
    return (
        <div>
            <label className='mb-1 block text-sm text-gray-700'>{label}</label>
            <p className='rounded-lg border border-brand_soft/40 bg-brand_soft/10 px-3 py-2 text-sm text-night_green'>
                {value || "—"}
            </p>
        </div>
    )
}
