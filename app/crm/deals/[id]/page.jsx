import Link from "next/link"
import { notFound } from "next/navigation"
import { getServerSession } from "next-auth"
import { LuPencil, LuFileText } from "react-icons/lu"
import { authOptions } from "@/configs/auth"
import prisma from "@/lib/client"
import { DEAL_LOSS_REASON_LABELS, dealDisplayTitle } from "@/lib/crm/deal"
import { formatMoney, formatPercent } from "@/lib/crm/format"
import CrmBackLink from "@/components/crm/CrmBackLink"
import DealItemsSection from "@/components/crm/DealItemsSection"
import DealStatusControl from "@/components/crm/DealStatusControl"
import DealShipmentsSection from "@/components/crm/DealShipmentsSection"
import ActivityPanel from "@/components/crm/ActivityPanel"

export const metadata = { title: "Сделка | CRM" }

function fullName(u) {
    if (!u) return "—"
    return `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email
}

function contactDisplay(c) {
    if (!c) return null
    const name = `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim()
    return name || c.email || c.phone || "Контакт"
}

export default async function DealPage({ params }) {
    const session = await getServerSession(authOptions)
    const item = await prisma.deal.findUnique({
        where: { id: params.id },
        include: {
            counterparty: true,
            contact: true,
            manager: true,
            createdBy: true,
            updatedBy: true,
            items: { orderBy: { createdAt: "asc" } },
            sourceProject: {
                select: { id: true, internalName: true, externalAuctionId: true },
            },
        },
    })
    if (!item) notFound()

    const dealItemsForClient = item.items.map(i => ({
        id: i.id,
        sku: i.sku,
        name: i.name,
        quantity: i.quantity.toString(),
    }))

    const itemsForClient = item.items.map(i => ({
        ...i,
        quantity: i.quantity.toString(),
        amount: i.amount.toString(),
        createdAt: i.createdAt.toISOString(),
        updatedAt: i.updatedAt.toISOString(),
    }))

    return (
        <div className='space-y-4'>
            <CrmBackLink
                fallback='/crm/deals'
                fallbackLabel='Сделки'
                className='inline-flex items-center gap-1 text-xs text-night_green/55 hover:text-brand_main'
            />

            {/* Title row */}
            <div className='flex flex-wrap items-start justify-between gap-3'>
                <div className='min-w-0'>
                    <p className='text-xs uppercase tracking-wider text-night_green/55'>
                        Сделка
                    </p>
                    <h1 className='mt-0.5 truncate text-xl font-semibold text-night_green sm:text-2xl'>
                        {dealDisplayTitle(item, item.counterparty?.name)}
                    </h1>
                    <p className='mt-1 text-sm text-night_green/70'>
                        Клиент:{" "}
                        <Link
                            href={`/crm/counterparties/${item.counterparty.id}`}
                            className='underline hover:text-brand_main'
                        >
                            {item.counterparty.name}
                        </Link>{" "}
                        <span className='text-night_green/50'>·</span>{" "}
                        {item.counterparty.type === "DISTRIBUTOR"
                            ? "Дистрибьютор"
                            : "Конечный потребитель"}
                    </p>
                    {item.sourceProject && (
                        <p className='mt-1 text-sm text-blue-700'>
                            По проекту:{" "}
                            <Link
                                href={`/crm/projects/${item.sourceProject.id}`}
                                className='underline hover:text-blue-900'
                            >
                                {item.sourceProject.internalName}
                            </Link>{" "}
                            <span className='break-all text-night_green/50'>
                                (аукцион {item.sourceProject.externalAuctionId})
                            </span>
                        </p>
                    )}
                </div>
                <div className='flex flex-col items-end gap-2'>
                    <DealStatusControl dealId={item.id} currentStatus={item.status} />
                    <div className='flex flex-wrap justify-end gap-2'>
                        <Link
                            href={`/crm/deals/${item.id}/edit`}
                            className='inline-flex items-center gap-1.5 rounded-lg border border-brand_soft/60 bg-white px-3 py-1.5 text-xs font-medium text-night_green/75 hover:bg-brand_soft/30'
                        >
                            <LuPencil className='h-3 w-3' />
                            Редактировать
                        </Link>
                        <Link
                            href={`/crm/deals/${item.id}/proposal`}
                            className='inline-flex items-center gap-1.5 rounded-lg bg-brand_main px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-brand_main/90'
                        >
                            <LuFileText className='h-3 w-3' />
                            Сформировать КП
                        </Link>
                    </div>
                </div>
            </div>

            {(item.status === "CANCELLED" || item.status === "ARCHIVED") &&
                item.lossReason && (
                    <div className='rounded-xl border border-red-200 bg-red-50/60 px-4 py-3'>
                        <p className='text-xs font-semibold uppercase tracking-wide text-red-700'>
                            Причина проигрыша
                        </p>
                        <p className='mt-1 text-sm text-red-900'>
                            {DEAL_LOSS_REASON_LABELS[item.lossReason] || item.lossReason}
                            {item.lossComment && (
                                <span className='text-red-900/75'> — {item.lossComment}</span>
                            )}
                        </p>
                    </div>
                )}

            {/* Two-column body */}
            <div className='grid grid-cols-[minmax(0,1fr)] items-start gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(360px,1fr)]'>
                <div className='min-w-0 space-y-4'>
                    <Section
                        title='Параметры'
                        footer={`Создал ${fullName(item.createdBy)} · ${new Date(item.createdAt).toLocaleString("ru-RU")}${
                            item.updatedBy
                                ? ` · изменил ${fullName(item.updatedBy)} · ${new Date(item.updatedAt).toLocaleString("ru-RU")}`
                                : ""
                        }`}
                    >
                        <Row label='Сумма сделки' value={formatMoney(item.totalAmount)} />
                        <Row
                            label='Скидка'
                            value={
                                item.discount != null ? formatPercent(item.discount) : "—"
                            }
                        />
                        <Row label='Менеджер' value={fullName(item.manager)} />
                        <Row label='Контактное лицо' value={contactDisplay(item.contact)} />
                    </Section>

                    {(item.deliveryAddress || item.note) && (
                        <Section title='Доставка и примечание'>
                            {item.deliveryAddress && (
                                <div className='sm:col-span-2 lg:col-span-3'>
                                    <dt className='text-[10px] uppercase tracking-wider text-night_green/55'>
                                        Адрес доставки
                                    </dt>
                                    <dd className='mt-0.5 whitespace-pre-wrap text-sm text-night_green'>
                                        {item.deliveryAddress}
                                    </dd>
                                </div>
                            )}
                            {item.note && (
                                <div className='sm:col-span-2 lg:col-span-3'>
                                    <dt className='text-[10px] uppercase tracking-wider text-night_green/55'>
                                        Примечание
                                    </dt>
                                    <dd className='mt-0.5 whitespace-pre-wrap text-sm text-night_green'>
                                        {item.note}
                                    </dd>
                                </div>
                            )}
                        </Section>
                    )}

                    <DealItemsSection dealId={item.id} initialItems={itemsForClient} />

                    <DealShipmentsSection
                        dealId={item.id}
                        dealItems={dealItemsForClient}
                        counterpartyId={item.counterparty.id}
                        initialDeliveryAddress={
                            item.deliveryAddress || item.counterparty.address || ""
                        }
                    />
                </div>

                <ActivityPanel
                    entityType='Deal'
                    entityId={item.id}
                    taskRelationKind='deal'
                    currentUserId={session?.user?.id}
                    currentUserRole={session?.user?.role}
                    historyIncludeChildren
                />
            </div>
        </div>
    )
}

function Section({ title, footer, children }) {
    return (
        <section className='rounded-xl border border-brand_soft/40 bg-white/70 p-4'>
            <h2 className='mb-2.5 text-xs font-semibold uppercase tracking-wide text-night_green/70'>
                {title}
            </h2>
            <dl className='grid gap-x-4 gap-y-2.5 sm:grid-cols-2 lg:grid-cols-3'>{children}</dl>
            {footer && (
                <p className='mt-3 border-t border-brand_soft/30 pt-2 text-[11px] text-night_green/50'>
                    {footer}
                </p>
            )}
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
