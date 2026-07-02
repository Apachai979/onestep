import Link from "next/link"
import { notFound } from "next/navigation"
import { getServerSession } from "next-auth"
import { LuPencil, LuPlus } from "react-icons/lu"
import { authOptions } from "@/configs/auth"
import prisma from "@/lib/client"
import { DEAL_STATUS_LABELS } from "@/lib/crm/deal"
import { formatMoney } from "@/lib/crm/format"
import { looksLikeUrl } from "@/lib/crm/project"
import ProjectItemsSection from "@/components/crm/ProjectItemsSection"
import ProjectStatusControl from "@/components/crm/ProjectStatusControl"
import ActivityPanel from "@/components/crm/ActivityPanel"
import ChangeHistorySection from "@/components/crm/ChangeHistorySection"
import CrmBackLink from "@/components/crm/CrmBackLink"

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
    const session = await getServerSession(authOptions)
    const item = await prisma.project.findUnique({
        where: { id: params.id },
        include: {
            distributor: true,
            endCustomer: true,
            manager: true,
            updatedBy: true,
            items: { orderBy: { createdAt: "asc" } },
            contacts: { orderBy: [{ lastName: "asc" }, { firstName: "asc" }] },
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
        <div className='space-y-5'>
            <CrmBackLink
                fallback='/crm/projects'
                fallbackLabel='Проекты'
                className='inline-flex items-center gap-1 text-xs text-night_green/55 hover:text-brand_main'
            />

            <div className='flex flex-wrap items-start justify-between gap-3'>
                <div className='min-w-0'>
                    <p className='text-xs uppercase tracking-wider text-night_green/55'>
                        Проект
                    </p>
                    <h1 className='mt-0.5 text-2xl font-semibold text-night_green sm:text-3xl'>
                        {item.internalName}
                    </h1>
                    <p className='mt-1 text-sm text-night_green/70'>
                        Аукцион:{" "}
                        {looksLikeUrl(item.externalAuctionId) ? (
                            <a
                                href={item.externalAuctionId}
                                target='_blank'
                                rel='noopener noreferrer'
                                className='break-all text-brand_main underline hover:text-brand_main/80'
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
                    <div className='flex flex-wrap justify-end gap-2'>
                        <Link
                            href={`/crm/projects/${item.id}/edit`}
                            className='inline-flex items-center gap-1.5 rounded-lg border border-brand_soft/60 bg-white px-3 py-1.5 text-xs font-medium text-night_green/75 hover:bg-brand_soft/30'
                        >
                            <LuPencil className='h-3 w-3' />
                            Редактировать
                        </Link>
                        <Link
                            href={`/crm/deals/new?fromProjectId=${item.id}`}
                            className='inline-flex items-center gap-1.5 rounded-lg bg-brand_main px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-brand_main/90'
                        >
                            <LuPlus className='h-3 w-3' />
                            Создать сделку
                        </Link>
                    </div>
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

            <div className='grid items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]'>
                <div className='min-w-0 space-y-5'>
                    <Section title='Связка'>
                        <Row label='Конечный потребитель'>
                            <Link
                                href={`/crm/counterparties/${item.endCustomer.id}`}
                                className='text-night_green underline hover:text-brand_main'
                            >
                                {item.endCustomer.name}
                            </Link>
                        </Row>
                        <Row label='Регион ЛПУ' value={item.endCustomer.region} />
                        <Row label='Дистрибьютор'>
                            <Link
                                href={`/crm/counterparties/${item.distributor.id}`}
                                className='text-night_green underline hover:text-brand_main'
                            >
                                {item.distributor.name}
                            </Link>
                        </Row>
                        <Row label='Регион дистрибьютора' value={item.distributor.region} />
                        <Row label='Менеджер' value={fullName(item.manager)} />
                        <Row label='Дата аукциона' value={fmtDate(item.auctionDate)} />
                        <Row label='Сумма проекта' value={formatMoney(item.totalAmount)} />
                        <Row label='Создан' value={fmtDate(item.createdAt)} />
                        <Row label='Изменил' value={fullName(item.updatedBy)} />
                        <Row
                            label='Изменён'
                            value={new Date(item.updatedAt).toLocaleString("ru-RU")}
                        />
                    </Section>

                    <section className='rounded-xl border border-brand_soft/40 bg-white/70 p-4 sm:p-5'>
                        <h2 className='mb-3 text-sm font-semibold uppercase tracking-wide text-night_green/70'>
                            Контактные лица
                        </h2>
                        <div className='grid gap-4 sm:grid-cols-2'>
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

                    <section className='rounded-xl border border-brand_soft/40 bg-white/70 p-4 sm:p-5'>
                        <h2 className='mb-3 text-sm font-semibold uppercase tracking-wide text-night_green/70'>
                            Сделки по проекту
                        </h2>
                        {item.deals.length === 0 ? (
                            <p className='text-sm text-night_green/55'>
                                Связанных сделок ещё нет. Используйте «+ Создать сделку» в шапке.
                            </p>
                        ) : (
                            <div className='overflow-x-auto rounded-lg border border-brand_soft/40'>
                                <table className='w-full text-sm'>
                                    <thead className='bg-brand_soft/30 text-left text-xs uppercase tracking-wider text-night_green/70'>
                                        <tr>
                                            <th className='px-3 py-2'>Название</th>
                                            <th className='px-3 py-2'>Клиент</th>
                                            <th className='px-3 py-2'>Менеджер</th>
                                            <th className='px-3 py-2'>Статус</th>
                                            <th className='px-3 py-2 text-right'>Сумма</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {item.deals.map(d => (
                                            <tr
                                                key={d.id}
                                                className='border-t border-brand_soft/30 hover:bg-brand_soft/15'
                                            >
                                                <td className='px-3 py-2'>
                                                    <Link
                                                        href={`/crm/deals/${d.id}`}
                                                        className='font-medium text-night_green hover:text-brand_main'
                                                    >
                                                        {d.title || `Сделка с ${d.counterparty?.name || "клиентом"}`}
                                                    </Link>
                                                </td>
                                                <td className='px-3 py-2 text-night_green/75'>
                                                    {d.counterparty?.name || "—"}
                                                </td>
                                                <td className='px-3 py-2 text-night_green/75'>
                                                    {fullName(d.manager)}
                                                </td>
                                                <td className='px-3 py-2 text-night_green/75'>
                                                    {DEAL_STATUS_LABELS[d.status] || d.status}
                                                </td>
                                                <td className='px-3 py-2 text-right text-night_green/75'>
                                                    {formatMoney(d.totalAmount)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                </div>

                <ActivityPanel
                    entityType='Project'
                    entityId={item.id}
                    taskRelationKind='project'
                    currentUserId={session?.user?.id}
                    currentUserRole={session?.user?.role}
                />
            </div>

            <ChangeHistorySection entityType='Project' entityId={item.id} includeChildren />
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

function Row({ label, value, children, className = "" }) {
    return (
        <div className={className}>
            <dt className='text-[10px] uppercase tracking-wider text-night_green/55'>
                {label}
            </dt>
            <dd className='mt-0.5 text-sm text-night_green'>{children ?? value ?? "—"}</dd>
        </div>
    )
}

function ContactGroup({ title, contacts }) {
    return (
        <div>
            <p className='mb-2 text-[10px] uppercase tracking-wider text-night_green/55'>
                {title}
            </p>
            {contacts.length === 0 ? (
                <p className='text-sm text-night_green/55'>Не выбраны.</p>
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
                                className='rounded-md border border-brand_soft/30 bg-white/60 px-3 py-2 text-sm'
                            >
                                <p className='font-medium text-night_green'>{name}</p>
                                <p className='text-xs text-night_green/65'>
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
