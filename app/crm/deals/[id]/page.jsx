import Link from "next/link"
import { notFound } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/configs/auth"
import prisma from "@/lib/client"
import { dealDisplayTitle } from "@/lib/crm/deal"
import { formatMoney } from "@/lib/crm/format"
import DealItemsSection from "@/components/crm/DealItemsSection"
import DealStatusControl from "@/components/crm/DealStatusControl"
import DealShipmentsSection from "@/components/crm/DealShipmentsSection"
import RelatedTasksSection from "@/components/crm/RelatedTasksSection"
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
        <div className='max-w-5xl space-y-6'>
            <div className='text-sm'>
                <Link href='/crm/deals' className='text-gray-500 hover:text-primary_green'>
                    ← Сделки
                </Link>
            </div>

            <div className='flex flex-wrap items-start justify-between gap-4'>
                <div>
                    <p className='text-xs uppercase text-gray-500'>Сделка</p>
                    <h1 className='mt-1 text-2xl font-semibold text-night_green'>
                        {dealDisplayTitle(item, item.counterparty?.name)}
                    </h1>
                    <p className='mt-1 text-sm text-gray-600'>
                        Клиент:{" "}
                        <Link
                            href={`/crm/counterparties/${item.counterparty.id}`}
                            className='underline hover:text-primary_green'
                        >
                            {item.counterparty.name}
                        </Link>{" "}
                        ·{" "}
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
                            <span className='text-gray-500'>
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
                            className='rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100'
                        >
                            Редактировать
                        </Link>
                        <Link
                            href={`/crm/deals/${item.id}/proposal`}
                            className='rounded-lg bg-primary_green px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-contrast_green'
                        >
                            Сформировать КП
                        </Link>
                    </div>
                </div>
            </div>

            <Section title='Параметры'>
                <Row label='Контактное лицо' value={contactDisplay(item.contact)} />
                <Row label='Ответственный менеджер' value={fullName(item.manager)} />
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
                <Row label='Сумма сделки' value={formatMoney(item.totalAmount)} />
            </Section>

            {item.note && (
                <Section title='Примечание'>
                    <p className='whitespace-pre-wrap text-sm text-gray-800 sm:col-span-2'>
                        {item.note}
                    </p>
                </Section>
            )}

            <DealItemsSection dealId={item.id} initialItems={itemsForClient} />

            <DealShipmentsSection
                dealId={item.id}
                dealItems={dealItemsForClient}
                counterpartyId={item.counterparty.id}
                initialDeliveryAddress={item.counterparty.address || ""}
            />

            <RelatedTasksSection
                relationKind='deal'
                relationId={item.id}
                currentUserId={session?.user?.id}
                currentUserRole={session?.user?.role}
            />

            <ChangeHistorySection entityType='Deal' entityId={item.id} includeChildren />
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
