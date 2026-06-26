import Link from "next/link"
import { notFound } from "next/navigation"
import prisma from "@/lib/client"
import {
    SHIPMENT_STATUS_COLORS,
    SHIPMENT_STATUS_LABELS,
    isShipmentOverdue,
} from "@/lib/crm/shipment"

export const metadata = { title: "Отгрузка | CRM" }

function fmtDate(d) {
    if (!d) return "—"
    return new Date(d).toLocaleDateString("ru-RU")
}

function fmtDateTime(d) {
    if (!d) return "—"
    return new Date(d).toLocaleString("ru-RU")
}

function fullName(u) {
    if (!u) return "—"
    return `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email
}

function contactName(c) {
    if (!c) return "—"
    const fn = `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim()
    return fn || c.email || c.phone || "Контакт"
}

function fmtQty(v) {
    if (v === null || v === undefined) return "0"
    const s = typeof v === "object" && v.toString ? v.toString() : String(v)
    const n = Number(s.replace(",", "."))
    return (Math.round(n * 1000) / 1000).toString().replace(".", ",")
}

export default async function ShipmentPage({ params }) {
    const item = await prisma.shipment.findUnique({
        where: { id: params.id },
        include: {
            deal: {
                select: {
                    id: true,
                    title: true,
                    status: true,
                    counterparty: { select: { id: true, name: true, type: true } },
                    manager: { select: { firstName: true, lastName: true, email: true } },
                },
            },
            items: {
                include: {
                    dealItem: {
                        select: { id: true, name: true, sku: true, quantity: true, amount: true },
                    },
                },
            },
            recipientContact: true,
            createdBy: true,
            updatedBy: true,
        },
    })
    if (!item) notFound()

    const overdue = isShipmentOverdue(item)

    return (
        <div className='max-w-4xl space-y-6'>
            <div className='text-sm'>
                <Link href='/crm/shipments' className='text-gray-500 hover:text-primary_green'>
                    ← Отгрузки
                </Link>
            </div>

            <div className='flex flex-wrap items-start justify-between gap-4'>
                <div>
                    <p className='text-xs uppercase text-gray-500'>Отгрузка</p>
                    <h1 className='mt-1 font-mono text-2xl font-semibold text-night_green'>
                        {item.number}
                    </h1>
                    <div className='mt-2 flex flex-wrap items-center gap-2'>
                        <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${SHIPMENT_STATUS_COLORS[item.status]}`}
                        >
                            {SHIPMENT_STATUS_LABELS[item.status]}
                        </span>
                        {overdue && (
                            <span className='rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700'>
                                Просрочена
                            </span>
                        )}
                    </div>
                    <p className='mt-2 text-sm text-gray-600'>
                        Сделка:{" "}
                        <Link
                            href={`/crm/deals/${item.deal.id}`}
                            className='underline hover:text-primary_green'
                        >
                            {item.deal.title || `Сделка #${item.deal.id.slice(-6)}`}
                        </Link>
                    </p>
                    <p className='text-sm text-gray-600'>
                        Клиент:{" "}
                        <Link
                            href={`/crm/counterparties/${item.deal.counterparty.id}`}
                            className='underline hover:text-primary_green'
                        >
                            {item.deal.counterparty.name}
                        </Link>
                    </p>
                </div>
            </div>

            <Section title='Параметры'>
                <Row label='Плановая дата' value={fmtDate(item.plannedDate)} />
                <Row label='Фактическая отгрузка' value={fmtDateTime(item.shippedAt)} />
                <Row label='Перевозчик' value={item.carrier} />
                <Row label='Трек-номер' value={item.trackingNumber} />
                <Row label='№ ТТН / документа' value={item.docNumber} />
                <Row label='Получатель' value={contactName(item.recipientContact)} />
                <Row label='Адрес доставки' value={item.deliveryAddress} className='sm:col-span-2' />
                <Row label='Менеджер сделки' value={fullName(item.deal.manager)} />
                <Row label='Создал' value={fullName(item.createdBy)} />
                <Row label='Создана' value={fmtDateTime(item.createdAt)} />
                <Row label='Изменил' value={fullName(item.updatedBy)} />
                <Row label='Изменена' value={fmtDateTime(item.updatedAt)} />
            </Section>

            {item.note && (
                <Section title='Комментарий'>
                    <p className='whitespace-pre-wrap text-sm text-gray-800 sm:col-span-2'>
                        {item.note}
                    </p>
                </Section>
            )}

            <section className='rounded-xl border border-gray-200 bg-white p-5'>
                <h2 className='mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500'>
                    Позиции отгрузки
                </h2>
                <div className='overflow-x-auto rounded-lg border border-gray-100'>
                    <table className='w-full text-sm'>
                        <thead className='bg-gray-50 text-left text-xs uppercase text-gray-500'>
                            <tr>
                                <th className='px-3 py-2'>Артикул</th>
                                <th className='px-3 py-2'>Наименование</th>
                                <th className='px-3 py-2 text-right'>В сделке</th>
                                <th className='px-3 py-2 text-right'>Отгружается</th>
                                <th className='px-3 py-2'>Комментарий</th>
                            </tr>
                        </thead>
                        <tbody>
                            {item.items.length === 0 && (
                                <tr>
                                    <td colSpan={5} className='px-3 py-4 text-center text-gray-400'>
                                        Позиций нет
                                    </td>
                                </tr>
                            )}
                            {item.items.map(it => (
                                <tr key={it.id} className='border-t border-gray-100'>
                                    <td className='px-3 py-2 text-gray-700'>
                                        {it.dealItem?.sku || "—"}
                                    </td>
                                    <td className='px-3 py-2 text-gray-800'>
                                        {it.dealItem?.name || "—"}
                                    </td>
                                    <td className='px-3 py-2 text-right text-gray-700'>
                                        {fmtQty(it.dealItem?.quantity)}
                                    </td>
                                    <td className='px-3 py-2 text-right font-semibold text-gray-800'>
                                        {fmtQty(it.quantity)}
                                    </td>
                                    <td className='px-3 py-2 text-gray-600'>{it.note || "—"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    )
}

function Section({ title, children }) {
    return (
        <section className='rounded-xl border border-gray-200 bg-white p-5'>
            <h2 className='mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500'>
                {title}
            </h2>
            <dl className='grid gap-4 sm:grid-cols-2'>{children}</dl>
        </section>
    )
}

function Row({ label, value, className = "" }) {
    return (
        <div className={className}>
            <dt className='text-xs uppercase text-gray-500'>{label}</dt>
            <dd className='mt-1 text-sm text-gray-800'>{value || "—"}</dd>
        </div>
    )
}
