import Link from "next/link"
import { notFound } from "next/navigation"
import { getServerSession } from "next-auth"
import { LuPencil, LuFileText } from "react-icons/lu"
import { authOptions } from "@/configs/auth"
import prisma from "@/lib/client"
import { dealDisplayTitle } from "@/lib/crm/deal"
import { formatMoney, formatPercent } from "@/lib/crm/format"
import DealItemsSection from "@/components/crm/DealItemsSection"
import DealStatusControl from "@/components/crm/DealStatusControl"
import DealShipmentsSection from "@/components/crm/DealShipmentsSection"
import ActivityPanel from "@/components/crm/ActivityPanel"
import ChangeHistorySection from "@/components/crm/ChangeHistorySection"

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
        <div className='space-y-5'>
            {/* Back link */}
            <Link
                href='/crm/deals'
                className='inline-flex text-xs text-night_green/55 hover:text-brand_main'
            >
                ← Сделки
            </Link>

            {/* Title row */}
            <div className='flex flex-wrap items-start justify-between gap-3'>
                <div className='min-w-0'>
                    <p className='text-xs uppercase tracking-wider text-night_green/55'>
                        Сделка
                    </p>
                    <h1 className='mt-0.5 truncate text-2xl font-semibold text-night_green sm:text-3xl'>
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
                            <span className='text-night_green/50'>
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

            {/* Two-column body */}
            <div className='grid items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]'>
                <div className='min-w-0 space-y-5'>
                    <Section title='Параметры'>
                        <Row label='Сумма сделки' value={formatMoney(item.totalAmount)} />
                        <Row
                            label='Скидка'
                            value={
                                item.discount != null ? formatPercent(item.discount) : "—"
                            }
                        />
                        <Row label='Менеджер' value={fullName(item.manager)} />
                        <Row label='Контактное лицо' value={contactDisplay(item.contact)} />
                        <Row label='Создал' value={fullName(item.createdBy)} />
                        <Row
                            label='Создана'
                            value={new Date(item.createdAt).toLocaleString("ru-RU")}
                        />
                        <Row label='Изменил' value={fullName(item.updatedBy)} />
                        <Row
                            label='Изменена'
                            value={new Date(item.updatedAt).toLocaleString("ru-RU")}
                        />
                    </Section>

                    {(item.deliveryAddress || item.note) && (
                        <Section title='Доставка и примечание'>
                            {item.deliveryAddress && (
                                <div className='sm:col-span-2'>
                                    <dt className='text-[10px] uppercase tracking-wider text-night_green/55'>
                                        Адрес доставки
                                    </dt>
                                    <dd className='mt-0.5 whitespace-pre-wrap text-sm text-night_green'>
                                        {item.deliveryAddress}
                                    </dd>
                                </div>
                            )}
                            {item.note && (
                                <div className='sm:col-span-2'>
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
                />
            </div>

            <ChangeHistorySection entityType='Deal' entityId={item.id} includeChildren />
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
