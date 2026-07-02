"use client"
import { useEffect, useState } from "react"
import { LuCheck, LuTrash2, LuUndo2 } from "react-icons/lu"
import { EmptyState, TableSkeleton, useConfirm, useToast } from "@/components/crm/ui"

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
    const [items, setItems] = useState(null)
    const [status, setStatus] = useState("NEW")
    const [error, setError] = useState("")

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
                <TableSkeleton />
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
                <div className='overflow-x-auto rounded-xl border border-brand_soft/40 bg-white/70'>
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
            )}
        </div>
    )
}
