import Link from "next/link"
import { notFound } from "next/navigation"
import prisma from "@/lib/client"
import { formatMoney } from "@/lib/crm/format"
import { looksLikeUrl } from "@/lib/crm/project"
import ProjectItemsSection from "@/components/crm/ProjectItemsSection"
import ProjectStatusControl from "@/components/crm/ProjectStatusControl"

export const metadata = { title: "Проект | CRM" }

function fullName(u) {
    if (!u) return "—"
    return `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email
}

function fmtDate(d) {
    if (!d) return "—"
    return new Date(d).toLocaleDateString("ru-RU")
}

export default async function ProjectPage({ params }) {
    const item = await prisma.project.findUnique({
        where: { id: params.id },
        include: {
            distributor: true,
            endCustomer: true,
            manager: true,
            items: { orderBy: { createdAt: "asc" } },
            contacts: { orderBy: [{ lastName: "asc" }, { firstName: "asc" }] },
        },
    })
    if (!item) notFound()

    const contactsByCounterparty = {
        [item.distributorId]: [],
        [item.endCustomerId]: [],
    }
    for (const c of item.contacts) {
        if (contactsByCounterparty[c.counterpartyId]) {
            contactsByCounterparty[c.counterpartyId].push(c)
        }
    }

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
                <Link href='/crm/projects' className='text-gray-500 hover:text-primary_green'>
                    ← Проекты
                </Link>
            </div>

            <div className='flex flex-wrap items-start justify-between gap-4'>
                <div>
                    <p className='text-xs uppercase text-gray-500'>Проект</p>
                    <h1 className='mt-1 text-2xl font-semibold text-night_green'>
                        {item.internalName}
                    </h1>
                    <p className='mt-1 text-sm text-gray-600'>
                        Аукцион:{" "}
                        {looksLikeUrl(item.externalAuctionId) ? (
                            <a
                                href={item.externalAuctionId}
                                target='_blank'
                                rel='noopener noreferrer'
                                className='break-all text-primary_green underline hover:text-contrast_green'
                            >
                                {item.externalAuctionId}
                            </a>
                        ) : (
                            item.externalAuctionId
                        )}
                    </p>
                </div>
                <div className='flex flex-col items-end gap-2'>
                    <ProjectStatusControl
                        projectId={item.id}
                        currentStatus={item.status}
                    />
                    <Link
                        href={`/crm/projects/${item.id}/edit`}
                        className='rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100'
                    >
                        Редактировать
                    </Link>
                </div>
            </div>

            {item.duplicateComment && (
                <div className='rounded-lg border border-yellow-300 bg-yellow-50 p-4 text-sm'>
                    <p className='font-semibold text-yellow-900'>
                        Создан как дубль действующего проекта
                    </p>
                    <p className='mt-1 text-yellow-800'>{item.duplicateComment}</p>
                </div>
            )}

            <Section title='Связка'>
                <Row label='Конечный потребитель'>
                    <Link
                        href={`/crm/counterparties/${item.endCustomer.id}`}
                        className='text-night_green underline hover:text-primary_green'
                    >
                        {item.endCustomer.name}
                    </Link>
                </Row>
                <Row label='Регион ЛПУ' value={item.endCustomer.region} />
                <Row label='Дистрибьютор'>
                    <Link
                        href={`/crm/counterparties/${item.distributor.id}`}
                        className='text-night_green underline hover:text-primary_green'
                    >
                        {item.distributor.name}
                    </Link>
                </Row>
                <Row label='Регион дистрибьютора' value={item.distributor.region} />
                <Row label='Ответственный менеджер' value={fullName(item.manager)} />
                <Row label='Дата проведения аукциона' value={fmtDate(item.auctionDate)} />
            </Section>

            <Section title='Финансы'>
                <Row label='Сумма проекта' value={formatMoney(item.totalAmount)} />
                <Row label='Создан' value={fmtDate(item.createdAt)} />
            </Section>

            <section className='rounded-xl border border-gray-200 bg-white p-5'>
                <h2 className='mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500'>
                    Контактные лица проекта
                </h2>
                <div className='grid gap-5 sm:grid-cols-2'>
                    <ContactGroup
                        title='Конечный потребитель'
                        contacts={contactsByCounterparty[item.endCustomerId]}
                    />
                    <ContactGroup
                        title='Дистрибьютор'
                        contacts={contactsByCounterparty[item.distributorId]}
                    />
                </div>
            </section>

            <ProjectItemsSection projectId={item.id} initialItems={itemsForClient} />
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

function Row({ label, value, children, className = "" }) {
    return (
        <div className={className}>
            <dt className='text-xs uppercase text-gray-500'>{label}</dt>
            <dd className='mt-1 text-sm text-gray-800'>{children ?? value ?? "—"}</dd>
        </div>
    )
}

function ContactGroup({ title, contacts }) {
    return (
        <div>
            <p className='mb-2 text-xs uppercase text-gray-500'>{title}</p>
            {contacts.length === 0 ? (
                <p className='text-sm text-gray-400'>Не выбраны.</p>
            ) : (
                <ul className='space-y-1.5'>
                    {contacts.map(c => {
                        const name =
                            `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() ||
                            c.email ||
                            c.phone ||
                            "Без имени"
                        return (
                            <li
                                key={c.id}
                                className='rounded-md border border-gray-100 px-3 py-2 text-sm'
                            >
                                <p className='font-medium text-night_green'>{name}</p>
                                <p className='text-xs text-gray-600'>
                                    {[c.position, c.phone, c.email]
                                        .filter(Boolean)
                                        .join(" · ") || "—"}
                                </p>
                            </li>
                        )
                    })}
                </ul>
            )}
        </div>
    )
}
