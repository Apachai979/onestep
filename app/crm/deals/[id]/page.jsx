import Link from "next/link"
import { notFound } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/configs/auth"
import prisma from "@/lib/client"
import { dealDisplayTitle } from "@/lib/crm/deal"
import { formatMoney } from "@/lib/crm/format"
import DealItemsSection from "@/components/crm/DealItemsSection"
import DealStatusControl from "@/components/crm/DealStatusControl"
import RelatedTasksSection from "@/components/crm/RelatedTasksSection"

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
            items: { orderBy: { createdAt: "asc" } },
        },
    })
    if (!item) notFound()

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
                </div>
                <div className='flex flex-col items-end gap-2'>
                    <DealStatusControl dealId={item.id} currentStatus={item.status} />
                    <Link
                        href={`/crm/deals/${item.id}/edit`}
                        className='rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100'
                    >
                        Редактировать
                    </Link>
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

            <RelatedTasksSection
                relationKind='deal'
                relationId={item.id}
                currentUserId={session?.user?.id}
                currentUserRole={session?.user?.role}
            />
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
