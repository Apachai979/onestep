import Link from "next/link"
import { notFound } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/configs/auth"
import prisma from "@/lib/client"
import {
    SHIPMENT_STATUS_COLORS,
    SHIPMENT_STATUS_LABELS,
    isShipmentOverdue,
} from "@/lib/crm/shipment"
import ActivityPanel from "@/components/crm/ActivityPanel"
import CrmBackLink from "@/components/crm/CrmBackLink"
import LocalDateTime from "@/components/crm/LocalDateTime"

export const metadata = { title: "Отгрузка | CRM" }

function fullName(u) {
    if (!u) return "—"
    return `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email
}

function contactName(c) {
    if (!c) return "—"
    const fn = `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim()
    return fn || c.email || c.phone || "Контакт"
}

function recipientDisplay(item) {
    if (item.recipientContact) {
        const c = item.recipientContact
        const name = contactName(c)
        const extras = [c.phone, c.email].filter(Boolean).join(" · ")
        return extras ? `${name} (${extras})` : name
    }
    const parts = [
        item.recipientName,
        item.recipientPhone,
        item.recipientEmail,
    ].filter(Boolean)
    return parts.length ? parts.join(" · ") : null
}

function fmtQty(v) {
    if (v === null || v === undefined) return "0"
    const s = typeof v === "object" && v.toString ? v.toString() : String(v)
    const n = Number(s.replace(",", "."))
    return (Math.round(n * 1000) / 1000).toString().replace(".", ",")
}

export default async function ShipmentPage({ params }) {
    const session = await getServerSession(authOptions)
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
        <div className='space-y-5'>
            <CrmBackLink
                fallback='/crm/shipments'
                fallbackLabel='Отгрузки'
                className='inline-flex items-center gap-1 text-xs text-night_green/55 hover:text-brand_main'
            />

            <div className='flex flex-wrap items-start justify-between gap-3'>
                <div className='min-w-0'>
                    <p className='text-xs uppercase tracking-wider text-night_green/55'>
                        Отгрузка
                    </p>
                    <h1 className='mt-0.5 font-mono text-2xl font-semibold text-night_green sm:text-3xl'>
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
                    <p className='mt-2 text-sm text-night_green/70'>
                        Сделка:{" "}
                        <Link
                            href={`/crm/deals/${item.deal.id}`}
                            className='underline hover:text-brand_main'
                        >
                            {item.deal.title || `Сделка #${item.deal.id.slice(-6)}`}
                        </Link>{" "}
                        <span className='text-night_green/50'>·</span>{" "}
                        Клиент:{" "}
                        <Link
                            href={`/crm/counterparties/${item.deal.counterparty.id}`}
                            className='underline hover:text-brand_main'
                        >
                            {item.deal.counterparty.name}
                        </Link>
                    </p>
                </div>
            </div>

            <div className='grid grid-cols-[minmax(0,1fr)] items-start gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(360px,1fr)]'>
                <div className='min-w-0 space-y-5'>
                    <Section title='Параметры'>
                        <Row
                            label='Плановая дата'
                            value={<LocalDateTime value={item.plannedDate} format='date' />}
                        />
                        <Row
                            label='Фактическая отгрузка'
                            value={<LocalDateTime value={item.shippedAt} />}
                        />
                        <Row label='Перевозчик' value={item.carrier} />
                        <Row label='Трек-номер' value={item.trackingNumber} />
                        <Row label='№ ТТН / документа' value={item.docNumber} />
                        <Row label='Получатель' value={recipientDisplay(item)} />
                        <Row
                            label='Адрес доставки'
                            value={item.deliveryAddress}
                            className='sm:col-span-2'
                        />
                        <Row label='Менеджер сделки' value={fullName(item.deal.manager)} />
                        <Row label='Создал' value={fullName(item.createdBy)} />
                        <Row label='Создана' value={<LocalDateTime value={item.createdAt} />} />
                        <Row label='Изменил' value={fullName(item.updatedBy)} />
                        <Row label='Изменена' value={<LocalDateTime value={item.updatedAt} />} />
                    </Section>

                    {item.note && (
                        <Section title='Комментарий'>
                            <p className='whitespace-pre-wrap text-sm text-night_green/85 sm:col-span-2'>
                                {item.note}
                            </p>
                        </Section>
                    )}

                    <section className='rounded-xl border border-brand_soft/40 bg-white/70 p-4 sm:p-5'>
                        <h2 className='mb-3 text-sm font-semibold uppercase tracking-wide text-night_green/70'>
                            Позиции отгрузки
                        </h2>
                        <div className='overflow-x-auto rounded-lg border border-brand_soft/40'>
                            <table className='w-full text-sm'>
                                <thead className='bg-brand_soft/30 text-left text-xs uppercase tracking-wider text-night_green/70'>
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
                                            <td
                                                colSpan={5}
                                                className='px-3 py-4 text-center text-night_green/55'
                                            >
                                                Позиций нет
                                            </td>
                                        </tr>
                                    )}
                                    {item.items.map(it => (
                                        <tr
                                            key={it.id}
                                            className='border-t border-brand_soft/30'
                                        >
                                            <td className='px-3 py-2 text-night_green/75'>
                                                {it.dealItem?.sku || "—"}
                                            </td>
                                            <td className='px-3 py-2 text-night_green'>
                                                {it.dealItem?.name || "—"}
                                            </td>
                                            <td className='px-3 py-2 text-right text-night_green/75'>
                                                {fmtQty(it.dealItem?.quantity)}
                                            </td>
                                            <td className='px-3 py-2 text-right font-semibold text-night_green'>
                                                {fmtQty(it.quantity)}
                                            </td>
                                            <td className='px-3 py-2 text-night_green/65'>
                                                {it.note || "—"}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div>

                <ActivityPanel
                    entityType='Shipment'
                    entityId={item.id}
                    currentUserId={session?.user?.id}
                    currentUserRole={session?.user?.role}
                    historyIncludeChildren
                />
            </div>
        </div>
    )
}

function Section({ title, children }) {
    return (
        <section className='rounded-xl border border-brand_soft/40 bg-white/70 p-4 sm:p-5'>
            <h2 className='mb-3 text-sm font-semibold uppercase tracking-wide text-night_green/70'>
                {title}
            </h2>
            <dl className='grid gap-3 sm:grid-cols-2'>{children}</dl>
        </section>
    )
}

function Row({ label, value, className = "" }) {
    return (
        <div className={className}>
            <dt className='text-[10px] uppercase tracking-wider text-night_green/55'>
                {label}
            </dt>
            <dd className='mt-0.5 text-sm text-night_green'>{value || "—"}</dd>
        </div>
    )
}
