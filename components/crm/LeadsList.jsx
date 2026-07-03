"use client"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { LuBriefcase, LuCheck, LuTrash2, LuUndo2 } from "react-icons/lu"
import { CardListSkeleton, CardRow, EmptyState, MobileCard, useConfirm, useToast } from "@/components/crm/ui"
import SearchableSelect from "./SearchableSelect"

const DATE_FMT = new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
})

const FILTERS = [
    { value: "NEW", label: "Новые" },
    { value: "PROCESSED", label: "Обработанные" },
    { value: "", label: "Все" },
]

export default function LeadsList() {
    const toast = useToast()
    const confirm = useConfirm()
    const router = useRouter()
    const [items, setItems] = useState(null)
    const [status, setStatus] = useState("NEW")
    const [error, setError] = useState("")
    const [converting, setConverting] = useState(null)

    useEffect(() => {
        const controller = new AbortController()
        const params = new URLSearchParams()
        if (status) params.set("status", status)

        setError("")
        setItems(null)
        fetch(`/api/crm/leads?${params.toString()}`, { signal: controller.signal })
            .then(async r => {
                if (!r.ok) throw new Error((await r.json()).error || "Ошибка загрузки")
                return r.json()
            })
            .then(d => setItems(d.items))
            .catch(err => {
                if (err.name === "AbortError") return
                setError(err.message)
                setItems([])
            })

        return () => controller.abort()
    }, [status])

    async function setLeadStatus(lead, nextStatus) {
        const res = await fetch(`/api/crm/leads/${lead.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: nextStatus }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
            toast.error(data?.error || "Не удалось обновить заявку")
            return
        }
        setItems(prev =>
            status
                ? prev.filter(l => l.id !== lead.id)
                : prev.map(l => (l.id === lead.id ? data.item : l)),
        )
        toast.success(nextStatus === "PROCESSED" ? "Заявка обработана" : "Заявка возвращена в новые")
    }

    async function removeLead(lead) {
        const ok = await confirm({
            title: "Удалить заявку?",
            description: `Заявка от «${lead.firstName}${lead.lastName ? " " + lead.lastName : ""}» будет удалена безвозвратно.`,
            confirmText: "Удалить",
            variant: "danger",
        })
        if (!ok) return
        const res = await fetch(`/api/crm/leads/${lead.id}`, { method: "DELETE" })
        if (!res.ok) {
            const data = await res.json().catch(() => ({}))
            toast.error(data?.error || "Не удалось удалить заявку")
            return
        }
        setItems(prev => prev.filter(l => l.id !== lead.id))
        toast.success("Заявка удалена")
    }

    return (
        <div className='space-y-4'>
            <div className='flex flex-wrap items-center gap-2 rounded-xl border border-brand_soft/40 bg-white/70 p-4'>
                {FILTERS.map(f => (
                    <button
                        key={f.value}
                        type='button'
                        onClick={() => setStatus(f.value)}
                        className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                            status === f.value
                                ? "bg-brand_main text-white shadow-sm"
                                : "bg-white text-night_green/70 border border-brand_soft/60 hover:bg-brand_soft/20"
                        }`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {error && <p className='text-sm text-red-500'>{error}</p>}

            {items === null ? (
                <div className='space-y-3'>
                    <CardListSkeleton />
                </div>
            ) : items.length === 0 ? (
                <EmptyState
                    title='Заявок нет'
                    description={
                        status === "NEW"
                            ? "Новые заявки с формы обратной связи на сайте появятся здесь."
                            : "По выбранному фильтру заявок не найдено."
                    }
                />
            ) : (
                <>
                {/* Мобильные карточки */}
                <div className='space-y-3 md:hidden'>
                    {items.map(lead => (
                        <MobileCard key={lead.id}>
                            <div className='flex items-start justify-between gap-2'>
                                <span className='font-medium text-night_green'>
                                    {lead.firstName}
                                    {lead.lastName ? ` ${lead.lastName}` : ""}
                                </span>
                                <span
                                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                        lead.status === "NEW"
                                            ? "bg-brand_main/10 text-brand_main"
                                            : "bg-night_green/10 text-night_green/60"
                                    }`}
                                >
                                    {lead.status === "NEW" ? "Новая" : "Обработана"}
                                </span>
                            </div>
                            <p className='mt-0.5 text-xs text-night_green/60'>
                                {DATE_FMT.format(new Date(lead.createdAt))}
                                {lead.company ? ` · ${lead.company}` : ""}
                            </p>
                            <div className='mt-2 space-y-1'>
                                {lead.phone && (
                                    <CardRow label='Телефон'>
                                        <a
                                            href={`tel:${lead.phone.replace(/\s/g, "")}`}
                                            className='text-brand_main hover:underline'
                                        >
                                            {lead.phone}
                                        </a>
                                    </CardRow>
                                )}
                                {lead.email && (
                                    <CardRow label='E-mail'>
                                        <a
                                            href={`mailto:${lead.email}`}
                                            className='text-brand_main hover:underline'
                                        >
                                            {lead.email}
                                        </a>
                                    </CardRow>
                                )}
                            </div>
                            {lead.message && (
                                <p className='mt-2 whitespace-pre-wrap rounded-lg bg-brand_soft/15 p-2 text-sm text-night_green/80'>
                                    {lead.message}
                                </p>
                            )}
                            <div className='mt-3 flex flex-wrap justify-end gap-2'>
                                {lead.status === "NEW" && (
                                    <button
                                        type='button'
                                        onClick={() => setConverting(lead)}
                                        className='inline-flex items-center gap-1.5 rounded-md bg-brand_main px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-brand_main/90'
                                    >
                                        <LuBriefcase className='h-4 w-4' />
                                        В сделку
                                    </button>
                                )}
                                {lead.status === "NEW" ? (
                                    <button
                                        type='button'
                                        onClick={() => setLeadStatus(lead, "PROCESSED")}
                                        className='inline-flex items-center gap-1.5 rounded-md border border-brand_main/40 px-3 py-1.5 text-xs font-medium text-brand_main hover:bg-brand_main/10'
                                    >
                                        <LuCheck className='h-4 w-4' />
                                        Обработана
                                    </button>
                                ) : (
                                    <button
                                        type='button'
                                        onClick={() => setLeadStatus(lead, "NEW")}
                                        className='inline-flex items-center gap-1.5 rounded-md border border-brand_soft/60 px-3 py-1.5 text-xs font-medium text-night_green/70 hover:bg-brand_soft/30'
                                    >
                                        <LuUndo2 className='h-4 w-4' />
                                        Вернуть
                                    </button>
                                )}
                                <button
                                    type='button'
                                    onClick={() => removeLead(lead)}
                                    className='inline-flex items-center gap-1.5 rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50'
                                >
                                    <LuTrash2 className='h-4 w-4' />
                                    Удалить
                                </button>
                            </div>
                        </MobileCard>
                    ))}
                </div>

                <div className='hidden overflow-x-auto rounded-xl border border-brand_soft/40 bg-white/70 md:block'>
                    <table className='w-full min-w-max table-auto text-sm'>
                        <thead>
                            <tr className='border-b border-brand_soft/40 text-left text-xs text-night_green/60'>
                                <th className='px-4 py-3 font-medium'>Дата</th>
                                <th className='px-4 py-3 font-medium'>Имя</th>
                                <th className='px-4 py-3 font-medium'>Контакты</th>
                                <th className='px-4 py-3 font-medium'>Компания</th>
                                <th className='px-4 py-3 font-medium'>Сообщение</th>
                                <th className='px-4 py-3 font-medium'>Статус</th>
                                <th className='px-4 py-3' />
                            </tr>
                        </thead>
                        <tbody>
                            {items.map(lead => (
                                <tr
                                    key={lead.id}
                                    className='border-b border-brand_soft/20 align-top last:border-b-0 hover:bg-brand_soft/10'
                                >
                                    <td className='whitespace-nowrap px-4 py-3 text-night_green/70'>
                                        {DATE_FMT.format(new Date(lead.createdAt))}
                                    </td>
                                    <td className='px-4 py-3 font-medium text-night_green'>
                                        {lead.firstName}
                                        {lead.lastName ? ` ${lead.lastName}` : ""}
                                    </td>
                                    <td className='px-4 py-3'>
                                        {lead.phone && (
                                            <a
                                                href={`tel:${lead.phone.replace(/\s/g, "")}`}
                                                className='block text-brand_main hover:underline'
                                            >
                                                {lead.phone}
                                            </a>
                                        )}
                                        {lead.email && (
                                            <a
                                                href={`mailto:${lead.email}`}
                                                className='block text-brand_main hover:underline'
                                            >
                                                {lead.email}
                                            </a>
                                        )}
                                    </td>
                                    <td className='px-4 py-3 text-night_green/80'>
                                        {lead.company || "—"}
                                    </td>
                                    <td className='max-w-md whitespace-pre-wrap px-4 py-3 text-night_green/80'>
                                        {lead.message || "—"}
                                    </td>
                                    <td className='whitespace-nowrap px-4 py-3'>
                                        <span
                                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                                lead.status === "NEW"
                                                    ? "bg-brand_main/10 text-brand_main"
                                                    : "bg-night_green/10 text-night_green/60"
                                            }`}
                                        >
                                            {lead.status === "NEW" ? "Новая" : "Обработана"}
                                        </span>
                                    </td>
                                    <td className='whitespace-nowrap px-4 py-3 text-right'>
                                        {lead.status === "NEW" && (
                                            <button
                                                type='button'
                                                onClick={() => setConverting(lead)}
                                                title='Создать сделку из заявки'
                                                className='inline-flex h-8 w-8 items-center justify-center rounded-md text-brand_main hover:bg-brand_main/10'
                                            >
                                                <LuBriefcase className='h-4 w-4' />
                                            </button>
                                        )}
                                        {lead.status === "NEW" ? (
                                            <button
                                                type='button'
                                                onClick={() => setLeadStatus(lead, "PROCESSED")}
                                                title='Отметить обработанной'
                                                className='inline-flex h-8 w-8 items-center justify-center rounded-md text-brand_main hover:bg-brand_main/10'
                                            >
                                                <LuCheck className='h-4 w-4' />
                                            </button>
                                        ) : (
                                            <button
                                                type='button'
                                                onClick={() => setLeadStatus(lead, "NEW")}
                                                title='Вернуть в новые'
                                                className='inline-flex h-8 w-8 items-center justify-center rounded-md text-night_green/60 hover:bg-brand_soft/30'
                                            >
                                                <LuUndo2 className='h-4 w-4' />
                                            </button>
                                        )}
                                        <button
                                            type='button'
                                            onClick={() => removeLead(lead)}
                                            title='Удалить'
                                            className='inline-flex h-8 w-8 items-center justify-center rounded-md text-red-500/70 hover:bg-red-50 hover:text-red-600'
                                        >
                                            <LuTrash2 className='h-4 w-4' />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                </>
            )}

            {converting && (
                <ConvertDialog
                    lead={converting}
                    onClose={() => setConverting(null)}
                    onDone={dealId => {
                        setConverting(null)
                        toast.success("Сделка создана", { title: "Заявка сконвертирована" })
                        router.push(`/crm/deals/${dealId}`)
                    }}
                />
            )}
        </div>
    )
}

const CP_TYPES = [
    { value: "END_CUSTOMER", label: "Конечный потребитель" },
    { value: "DISTRIBUTOR", label: "Дистрибьютор" },
]

function ConvertDialog({ lead, onClose, onDone }) {
    const toast = useToast()
    const [mode, setMode] = useState("new")
    const [counterparties, setCounterparties] = useState([])
    const [counterpartyId, setCounterpartyId] = useState("")
    const [form, setForm] = useState({
        name: lead.company || `${lead.firstName} ${lead.lastName || ""}`.trim(),
        type: "END_CUSTOMER",
        region: "",
    })
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState("")

    useEffect(() => {
        fetch("/api/crm/counterparties")
            .then(r => (r.ok ? r.json() : { items: [] }))
            .then(d => setCounterparties(d.items || []))
            .catch(() => setCounterparties([]))
    }, [])

    const options = useMemo(
        () =>
            counterparties.map(c => ({
                id: c.id,
                label: c.name,
                sublabel: `${
                    c.type === "DISTRIBUTOR" ? "Дистрибьютор" : "Конечный потребитель"
                }${c.region ? " · " + c.region : ""}`,
                search: `${c.name} ${c.inn ?? ""} ${c.region ?? ""}`,
            })),
        [counterparties],
    )

    async function handleSubmit(e) {
        e.preventDefault()
        setError("")
        if (mode === "existing" && !counterpartyId) {
            setError("Выберите контрагента")
            return
        }
        setSaving(true)
        try {
            const payload =
                mode === "existing"
                    ? { counterpartyId }
                    : { newCounterparty: form }
            const res = await fetch(`/api/crm/leads/${lead.id}/convert`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) {
                setError(data?.error || "Не удалось создать сделку")
                return
            }
            onDone(data.dealId)
        } catch (err) {
            toast.error(err?.message || "Сбой сети")
        } finally {
            setSaving(false)
        }
    }

    return (
        <div
            className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4'
            onClick={onClose}
        >
            <div
                onClick={e => e.stopPropagation()}
                className='max-h-[90vh] w-full max-w-lg overflow-auto rounded-xl bg-white p-5 shadow-2xl'
            >
                <h2 className='mb-1 text-lg font-semibold text-night_green'>
                    Сделка из заявки
                </h2>
                <p className='mb-4 text-sm text-night_green/60'>
                    {lead.firstName}
                    {lead.lastName ? ` ${lead.lastName}` : ""}
                    {lead.company ? ` · ${lead.company}` : ""}
                    {lead.phone ? ` · ${lead.phone}` : ""}
                </p>

                <div className='mb-4 flex gap-1 rounded-lg border border-brand_soft/40 bg-gray-50 p-1'>
                    {[
                        ["new", "Новый контрагент"],
                        ["existing", "Существующий"],
                    ].map(([m, label]) => (
                        <button
                            key={m}
                            type='button'
                            onClick={() => setMode(m)}
                            className={`flex-1 rounded-md px-3 py-1.5 text-sm transition ${
                                mode === m
                                    ? "bg-brand_main font-medium text-white"
                                    : "text-gray-700 hover:bg-brand_soft/30"
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                <form onSubmit={handleSubmit} className='space-y-3'>
                    {mode === "existing" ? (
                        <div>
                            <label className='mb-1 block text-xs text-gray-600'>
                                Контрагент
                            </label>
                            <SearchableSelect
                                value={counterpartyId}
                                onChange={setCounterpartyId}
                                options={options}
                                placeholder='Название, ИНН, регион'
                                emptyLabel='Контрагент не найден'
                            />
                        </div>
                    ) : (
                        <>
                            <div>
                                <label className='mb-1 block text-xs text-gray-600'>
                                    Название *
                                </label>
                                <input
                                    value={form.name}
                                    onChange={e =>
                                        setForm(p => ({ ...p, name: e.target.value }))
                                    }
                                    required
                                    className='w-full rounded-lg border border-brand_soft/60 px-3 py-2 text-sm shadow-sm focus:border-brand_main focus:outline-none'
                                />
                            </div>
                            <div className='grid gap-3 sm:grid-cols-2'>
                                <div>
                                    <label className='mb-1 block text-xs text-gray-600'>
                                        Тип
                                    </label>
                                    <select
                                        value={form.type}
                                        onChange={e =>
                                            setForm(p => ({ ...p, type: e.target.value }))
                                        }
                                        className='w-full rounded-lg border border-brand_soft/60 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand_main focus:outline-none'
                                    >
                                        {CP_TYPES.map(t => (
                                            <option key={t.value} value={t.value}>
                                                {t.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className='mb-1 block text-xs text-gray-600'>
                                        Регион *
                                    </label>
                                    <input
                                        value={form.region}
                                        onChange={e =>
                                            setForm(p => ({ ...p, region: e.target.value }))
                                        }
                                        required
                                        placeholder='Например: Томская обл'
                                        className='w-full rounded-lg border border-brand_soft/60 px-3 py-2 text-sm shadow-sm focus:border-brand_main focus:outline-none'
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    <p className='rounded-lg bg-brand_soft/15 p-3 text-xs leading-relaxed text-night_green/70'>
                        Будут созданы: контакт ({lead.firstName}
                        {lead.lastName ? ` ${lead.lastName}` : ""}) и сделка «Переговоры /
                        КП» с вами как менеджером. Текст заявки попадёт в примечание
                        сделки, заявка станет «Обработана».
                    </p>

                    {error && <p className='text-sm text-red-600'>{error}</p>}

                    <div className='flex justify-end gap-2'>
                        <button
                            type='button'
                            onClick={onClose}
                            className='rounded-lg border border-brand_soft/60 px-4 py-2 text-sm text-gray-700 hover:bg-brand_soft/30'
                        >
                            Отмена
                        </button>
                        <button
                            type='submit'
                            disabled={saving}
                            className='rounded-lg bg-brand_main px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand_main/90 disabled:opacity-60'
                        >
                            {saving ? "Создаём..." : "Создать сделку"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
