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
import LocalDateTime from "@/components/crm/LocalDateTime"

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
                select: { id: true, internalName: true },
            },
            sourceAuction: {
                select: { id: true, purchaseNumber: true },
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

    // Скидка в параметрах: сумма скидки и итог со скидкой считаются от суммы сделки.
    const totalAmount = Number(item.totalAmount) || 0
    const discountPct = item.discount != null ? Number(item.discount) : null
    const discountAmount = discountPct != null ? (totalAmount * discountPct) / 100 : null
    const discountedTotal = discountAmount != null ? totalAmount - discountAmount : null

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
                className='inline-flex items-center gap-1 text-xs text-neutral-400 hover:text-brand_main'
            />

            {/* Шапка повторяет колонки тела страницы: правая ячейка (КП + статус)
                стоит ровно над панелью активности и не сдвигает её вниз. */}
            <div className='grid grid-cols-[minmax(0,1fr)] items-stretch gap-x-4 gap-y-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(360px,1fr)]'>
                <div className='min-w-0'>
                    <p className='text-xs uppercase tracking-wider text-neutral-400'>Сделка</p>
                    <h1 className='mt-0.5 truncate text-xl font-semibold text-neutral-900 sm:text-2xl'>
                        {dealDisplayTitle(item, item.counterparty?.name)}
                    </h1>
                    {item.sourceProject && (
                        <p className='mt-1 text-sm text-blue-700'>
                            По проекту:{" "}
                            <Link
                                href={`/crm/projects/${item.sourceProject.id}`}
                                className='underline hover:text-blue-900'
                            >
                                {item.sourceProject.internalName}
                            </Link>
                        </p>
                    )}
                    {item.sourceAuction && (
                        <p className='mt-1 text-sm text-blue-700'>
                            По аукциону:{" "}
                            <Link
                                href={`/crm/auctions/${item.sourceAuction.id}`}
                                className='underline hover:text-blue-900'
                            >
                                {item.sourceAuction.purchaseNumber
                                    ? `Закупка № ${item.sourceAuction.purchaseNumber}`
                                    : "Аукцион"}
                            </Link>
                        </p>
                    )}
                </div>
                <div className='flex flex-wrap items-end justify-between gap-2'>
                    <DealStatusControl dealId={item.id} currentStatus={item.status} />
                    <Link
                        href={`/crm/deals/${item.id}/proposal`}
                        className='inline-flex items-center gap-1.5 rounded-lg bg-brand_main px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-brand_main/90'
                    >
                        <LuFileText className='h-3 w-3' />
                        Сформировать КП
                    </Link>
                </div>
            </div>

            {(item.status === "CANCELLED" || item.status === "ARCHIVED") && item.lossReason && (
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
                    {/* Клиент + параметры сделки — две карточки бок о бок */}
                    <div className='grid items-stretch gap-4 sm:grid-cols-2'>
                        <PartyCard
                            label={
                                item.counterparty.type === "DISTRIBUTOR"
                                    ? "Клиент · Дистрибьютор"
                                    : "Клиент · Конечный потребитель"
                            }
                            org={item.counterparty}
                            contact={item.contact}
                        />

                        <Section
                            title='Параметры'
                            action={
                                <Link
                                    href={`/crm/deals/${item.id}/edit`}
                                    className='inline-flex items-center gap-1 rounded-md border border-line bg-white px-2 py-1 text-[11px] font-medium text-neutral-900/75 hover:bg-surface_muted'
                                >
                                    <LuPencil className='h-3 w-3' />
                                    Редактировать
                                </Link>
                            }
                            columns='sm:grid-cols-2'
                            footer={
                                <>
                                    Создал {fullName(item.createdBy)} ·{" "}
                                    <LocalDateTime value={item.createdAt} />
                                    {item.updatedBy && (
                                        <>
                                            {" · "}изменил {fullName(item.updatedBy)} ·{" "}
                                            <LocalDateTime value={item.updatedAt} />
                                        </>
                                    )}
                                </>
                            }
                        >
                            <Row label='Сумма сделки' value={formatMoney(item.totalAmount)} />
                            <Row
                                label='Скидка'
                                value={
                                    discountPct != null
                                        ? `${formatPercent(discountPct)} (${formatMoney(discountAmount)})`
                                        : "—"
                                }
                            />
                            <Row
                                label='Сумма со скидкой'
                                value={discountedTotal != null ? formatMoney(discountedTotal) : "—"}
                            />
                            <Row label='Менеджер' value={fullName(item.manager)} />
                        </Section>
                    </div>

                    {(item.deliveryAddress || item.note) && (
                        <Section title='Доставка и примечание'>
                            {item.deliveryAddress && (
                                <div className='sm:col-span-2 lg:col-span-3'>
                                    <dt className='text-[10px] uppercase tracking-wider text-neutral-400'>
                                        Адрес доставки
                                    </dt>
                                    <dd className='mt-0.5 whitespace-pre-wrap text-sm text-neutral-900'>
                                        {item.deliveryAddress}
                                    </dd>
                                </div>
                            )}
                            {item.note && (
                                <div className='sm:col-span-2 lg:col-span-3'>
                                    <dt className='text-[10px] uppercase tracking-wider text-neutral-400'>
                                        Примечание
                                    </dt>
                                    <dd className='mt-0.5 whitespace-pre-wrap text-sm text-neutral-900'>
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

function Section({ title, footer, action, columns = "sm:grid-cols-2 lg:grid-cols-3", children }) {
    return (
        <section className='flex flex-col rounded-xl border border-line bg-white p-4'>
            <div className='mb-2.5 flex items-center justify-between gap-3'>
                <h2 className='text-xs font-semibold uppercase tracking-wide text-neutral-500'>
                    {title}
                </h2>
                {action && <div className='shrink-0'>{action}</div>}
            </div>
            <dl className={`grid flex-1 content-start gap-x-4 gap-y-2.5 ${columns}`}>{children}</dl>
            {footer && (
                <p className='mt-3 border-t border-line pt-2 text-[11px] text-neutral-400'>
                    {footer}
                </p>
            )}
        </section>
    )
}

// Самодостаточная карточка клиента сделки: роль, организация (ссылка),
// регион и контактное лицо — вся информация о стороне в одном месте.
function PartyCard({ label, org, contact }) {
    const contactName = contactDisplay(contact)
    const contactDetails = contact
        ? [
              contact.position,
              contact.phone,
              contact.workPhone ? `раб. ${contact.workPhone}` : null,
              contact.email,
          ]
              .filter(Boolean)
              .join(" · ")
        : ""
    return (
        <section className='flex flex-col rounded-xl border border-line bg-white p-4'>
            <p className='text-[10px] font-medium uppercase tracking-wider text-neutral-400'>
                {label}
            </p>
            <Link
                href={`/crm/counterparties/${org.id}`}
                className='mt-1 block text-base font-semibold leading-snug text-neutral-900 hover:text-brand_main'
            >
                {org.name}
            </Link>
            <p className='mt-1 text-sm text-neutral-500'>
                <span className='text-neutral-400'>Регион:</span> {org.region || "—"}
            </p>

            <div className='my-3 h-px bg-line' />

            <p className='mb-2 text-[10px] font-medium uppercase tracking-wider text-neutral-400'>
                Контактное лицо
            </p>
            {contact ? (
                <div className='rounded-lg border border-line bg-surface_muted px-3 py-2 text-sm'>
                    <p className='font-medium text-neutral-900'>{contactName}</p>
                    <p className='text-xs text-neutral-500'>{contactDetails || "—"}</p>
                </div>
            ) : (
                <p className='text-sm text-neutral-400'>Не выбрано.</p>
            )}
        </section>
    )
}

function Row({ label, value, className = "" }) {
    return (
        <div className={className}>
            <dt className='text-[10px] uppercase tracking-wider text-neutral-400'>{label}</dt>
            <dd className='mt-0.5 text-sm text-neutral-900'>{value || "—"}</dd>
        </div>
    )
}
