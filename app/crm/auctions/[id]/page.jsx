import Link from "next/link"
import { notFound } from "next/navigation"
import { getServerSession } from "next-auth"
import { LuPencil, LuExternalLink, LuPlus } from "react-icons/lu"
import { authOptions } from "@/configs/auth"
import prisma from "@/lib/client"
import { formatMoney } from "@/lib/crm/format"
import { DEAL_STATUS_COLORS, DEAL_STATUS_LABELS, dealDisplayTitle } from "@/lib/crm/deal"
import AuctionStatusControl from "@/components/crm/AuctionStatusControl"
import AuctionProtocolSection from "@/components/crm/AuctionProtocolSection"
import DealItemsSection from "@/components/crm/DealItemsSection"
import ActivityPanel from "@/components/crm/ActivityPanel"
import CrmBackLink from "@/components/crm/CrmBackLink"
import LocalDateTime from "@/components/crm/LocalDateTime"

export const metadata = { title: "Аукцион | CRM" }

function fullName(u) {
    if (!u) return "—"
    return `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email
}

function contactName(c) {
    if (!c) return "—"
    const fn = `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim()
    return fn || c.email || c.phone || "Контакт без имени"
}

export default async function AuctionPage({ params }) {
    const session = await getServerSession(authOptions)
    const item = await prisma.auction.findUnique({
        where: { id: params.id },
        include: {
            project: { select: { id: true, internalName: true } },
            customer: { select: { id: true, name: true, region: true } },
            supplier: { select: { id: true, name: true, region: true } },
            supplierContact: true,
            manager: true,
            updatedBy: true,
            items: { orderBy: { createdAt: "asc" } },
            deals: {
                orderBy: { createdAt: "desc" },
                include: {
                    counterparty: { select: { id: true, name: true } },
                    manager: { select: { firstName: true, lastName: true, email: true } },
                },
            },
        },
    })
    if (!item) notFound()

    // Итоговый протокол — вложение, id хранится на аукционе.
    const protocol = item.protocolAttachmentId
        ? await prisma.attachment.findUnique({
              where: { id: item.protocolAttachmentId },
              select: { id: true, fileName: true, size: true },
          })
        : null

    // Decimal → строки для клиентских компонентов.
    const itemsPlain = item.items.map(it => ({
        ...it,
        quantity: it.quantity.toString(),
        amount: it.amount.toString(),
        createdAt: it.createdAt.toISOString(),
        updatedAt: it.updatedAt.toISOString(),
    }))

    return (
        <div className='space-y-4'>
            <CrmBackLink
                fallback={`/crm/projects/${item.projectId}`}
                fallbackLabel='К проекту'
                className='inline-flex items-center gap-1 text-xs text-neutral-400 hover:text-brand_main'
            />

            <div className='flex flex-wrap items-start justify-between gap-3'>
                <div className='min-w-0'>
                    <p className='text-xs uppercase tracking-wider text-neutral-400'>
                        Аукцион · проект{" "}
                        <Link
                            href={`/crm/projects/${item.projectId}`}
                            className='text-brand_main hover:underline'
                        >
                            {item.project.internalName}
                        </Link>
                    </p>
                    <h1 className='mt-0.5 text-xl font-semibold text-neutral-900 sm:text-2xl'>
                        {item.purchaseNumber ? `Закупка № ${item.purchaseNumber}` : "Аукцион"}
                    </h1>
                </div>
                <AuctionStatusControl auctionId={item.id} currentStatus={item.status} />
            </div>

            {item.status === "LOST" && item.lossComment && (
                <div className='rounded-lg border border-red-200 bg-red-50 p-4 text-sm'>
                    <p className='text-xs font-semibold uppercase tracking-wide text-red-700'>
                        Причина проигрыша
                    </p>
                    <p className='mt-1 whitespace-pre-wrap text-red-900'>{item.lossComment}</p>
                </div>
            )}

            <div className='grid grid-cols-[minmax(0,1fr)] items-start gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(360px,1fr)]'>
                <div className='min-w-0 space-y-4'>
                    <Section
                        title='Параметры'
                        action={
                            <Link
                                href={`/crm/auctions/${item.id}/edit`}
                                className='inline-flex items-center gap-1 rounded-md border border-line bg-white px-2 py-1 text-[11px] font-medium text-neutral-900/75 hover:bg-surface_muted'
                            >
                                <LuPencil className='h-3 w-3' />
                                Редактировать
                            </Link>
                        }
                        footer={
                            item.updatedBy ? (
                                <>
                                    Изменил {fullName(item.updatedBy)} ·{" "}
                                    <LocalDateTime value={item.updatedAt} />
                                </>
                            ) : null
                        }
                    >
                        <Row label='Заказчик'>
                            <Link
                                href={`/crm/counterparties/${item.customer.id}`}
                                className='text-neutral-900 underline hover:text-brand_main'
                            >
                                {item.customer.name}
                            </Link>
                        </Row>
                        <Row label='Поставщик'>
                            <Link
                                href={`/crm/counterparties/${item.supplier.id}`}
                                className='text-neutral-900 underline hover:text-brand_main'
                            >
                                {item.supplier.name}
                            </Link>
                        </Row>
                        <Row label='Контакт поставщика'>
                            {item.supplierContact ? (
                                <>
                                    {contactName(item.supplierContact)}
                                    {item.supplierContact.phone && (
                                        <span className='block text-xs text-neutral-500'>
                                            {item.supplierContact.phone}
                                        </span>
                                    )}
                                </>
                            ) : (
                                "—"
                            )}
                        </Row>
                        <Row label='НМЦК' value={formatMoney(item.nmck)} />
                        <Row label='Ответственный менеджер' value={fullName(item.manager)} />
                        <Row label='Ссылка на аукцион'>
                            {item.auctionUrl ? (
                                <a
                                    href={item.auctionUrl}
                                    target='_blank'
                                    rel='noopener noreferrer'
                                    className='inline-flex items-center gap-1 text-brand_main hover:underline'
                                >
                                    Открыть
                                    <LuExternalLink className='h-3.5 w-3.5' />
                                </a>
                            ) : (
                                "—"
                            )}
                        </Row>
                        <Row label='Окончание сбора заявок'>
                            <LocalDateTime value={item.bidsDeadlineAt} />
                        </Row>
                        <Row label='Проведение аукциона'>
                            <LocalDateTime value={item.auctionAt} />
                        </Row>
                        <Row label='Подведение итогов'>
                            <LocalDateTime value={item.resultsAt} />
                        </Row>
                        <Row
                            label='Количество заявок'
                            value={item.bidsCount ?? "—"}
                        />
                        <Row
                            label='Количество участников'
                            value={item.participantsCount ?? "—"}
                        />
                        <Row label='Победитель' value={item.winner || "—"} />
                    </Section>

                    <DealItemsSection
                        initialItems={itemsPlain}
                        apiBase={`/api/crm/auctions/${item.id}`}
                    />

                    <section className='rounded-xl border border-line bg-white p-4'>
                        <div className='mb-2.5 flex items-center justify-between gap-3'>
                            <h2 className='text-xs font-semibold uppercase tracking-wide text-neutral-500'>
                                Сделки по аукциону ({item.deals.length})
                            </h2>
                            <SectionCreateButton
                                href={`/crm/deals/new?fromAuctionId=${item.id}`}
                                label='Создать сделку'
                            />
                        </div>
                        {item.deals.length === 0 ? (
                            <p className='text-sm text-neutral-400'>
                                Сделок по аукциону пока нет. Нажмите «Создать сделку» —
                                поставщик и товарные позиции подставятся из аукциона.
                            </p>
                        ) : (
                            <div className='space-y-2'>
                                {item.deals.map(d => (
                                    <Link
                                        key={d.id}
                                        href={`/crm/deals/${d.id}`}
                                        className='flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2 transition hover:bg-surface_muted'
                                    >
                                        <div className='min-w-0'>
                                            <p className='truncate text-sm font-medium text-neutral-900'>
                                                {dealDisplayTitle(d, d.counterparty?.name)}
                                            </p>
                                            <p className='mt-0.5 truncate text-xs text-neutral-500'>
                                                {d.counterparty?.name || "—"} · {fullName(d.manager)}
                                            </p>
                                        </div>
                                        <div className='flex shrink-0 items-center gap-2'>
                                            <span className='text-sm font-medium text-neutral-800'>
                                                {formatMoney(d.totalAmount)}
                                            </span>
                                            <span
                                                className={`rounded-full px-2 py-0.5 text-xs font-medium ${DEAL_STATUS_COLORS[d.status] || ""}`}
                                            >
                                                {DEAL_STATUS_LABELS[d.status] || d.status}
                                            </span>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </section>

                    <AuctionProtocolSection auctionId={item.id} protocol={protocol} />
                </div>

                <ActivityPanel
                    entityType='Auction'
                    entityId={item.id}
                    taskRelationKind='auction'
                    currentUserId={session?.user?.id}
                    currentUserRole={session?.user?.role}
                    historyIncludeChildren
                />
            </div>
        </div>
    )
}

function SectionCreateButton({ href, label }) {
    return (
        <Link
            href={href}
            className='inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand_main px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-brand_main/90'
        >
            <LuPlus className='h-3.5 w-3.5' />
            {label}
        </Link>
    )
}

function Section({ title, footer, action, children }) {
    return (
        <section className='rounded-xl border border-line bg-white p-4'>
            <div className='mb-2.5 flex items-center justify-between gap-3'>
                <h2 className='text-xs font-semibold uppercase tracking-wide text-neutral-500'>
                    {title}
                </h2>
                {action && <div className='shrink-0'>{action}</div>}
            </div>
            <dl className='grid gap-x-4 gap-y-2.5 sm:grid-cols-2 lg:grid-cols-3'>{children}</dl>
            {footer && (
                <p className='mt-3 border-t border-line pt-2 text-[11px] text-neutral-400'>
                    {footer}
                </p>
            )}
        </section>
    )
}

function Row({ label, value, children, className = "" }) {
    return (
        <div className={className}>
            <dt className='text-[10px] uppercase tracking-wider text-neutral-400'>
                {label}
            </dt>
            <dd className='mt-0.5 text-sm text-neutral-900'>{children ?? value ?? "—"}</dd>
        </div>
    )
}
