import Link from "next/link"
import { notFound } from "next/navigation"
import { getServerSession } from "next-auth"
import { LuBriefcase, LuPencil } from "react-icons/lu"
import { authOptions } from "@/configs/auth"
import prisma from "@/lib/client"
import { DEAL_STATUS_LABELS } from "@/lib/crm/deal"
import { formatMoney } from "@/lib/crm/format"
import { CardRow, MobileCard } from "@/components/crm/ui/MobileCards"
import ProjectStatusControl from "@/components/crm/ProjectStatusControl"
import ActivityPanel from "@/components/crm/ActivityPanel"
import CrmBackLink from "@/components/crm/CrmBackLink"
import LocalDateTime from "@/components/crm/LocalDateTime"

export const metadata = { title: "Проект | CRM" }

function fullName(u) {
    if (!u) return "—"
    return `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email
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

    // Сумма проекта — производная: сумма всех сделок, привязанных к проекту.
    const dealsSum = item.deals.reduce((s, d) => s + Number(d.totalAmount || 0), 0)
    const dealsCount = item.deals.length

    const contactsByCounterparty = {
        [item.distributorId]: [],
        [item.endCustomerId]: [],
    }
    for (const c of item.contacts) {
        if (contactsByCounterparty[c.counterpartyId]) {
            contactsByCounterparty[c.counterpartyId].push(c)
        }
    }

    return (
        <div className='space-y-4'>
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
                    <h1 className='mt-0.5 text-xl font-semibold text-night_green sm:text-2xl'>
                        {item.internalName}
                    </h1>
                </div>
                <div className='flex flex-wrap items-center gap-2'>
                    <Link
                        href={`/crm/deals/new?fromProjectId=${item.id}`}
                        className='inline-flex items-center gap-2 rounded-lg bg-brand_main px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand_main/90'
                    >
                        <LuBriefcase className='h-4 w-4' />
                        Создать сделку
                    </Link>
                    <ProjectStatusControl
                        projectId={item.id}
                        currentStatus={item.status}
                    />
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

            <div className='grid grid-cols-[minmax(0,1fr)] items-start gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(360px,1fr)]'>
                <div className='min-w-0 space-y-4'>
                    <Section
                        title='Связка'
                        action={
                            <Link
                                href={`/crm/projects/${item.id}/edit`}
                                className='inline-flex items-center gap-1 rounded-md border border-brand_soft/60 bg-white px-2 py-1 text-[11px] font-medium text-night_green/75 hover:bg-brand_soft/30'
                            >
                                <LuPencil className='h-3 w-3' />
                                Редактировать
                            </Link>
                        }
                        footer={
                            <>
                                Создан <LocalDateTime value={item.createdAt} format='date' />
                                {item.updatedBy && (
                                    <>
                                        {" · "}изменил {fullName(item.updatedBy)} ·{" "}
                                        <LocalDateTime value={item.updatedAt} />
                                    </>
                                )}
                            </>
                        }
                    >
                        {/* Организация и её регион — в одном ряду 3-колоночной сетки */}
                        <Row label='Конечный потребитель'>
                            <Link
                                href={`/crm/counterparties/${item.endCustomer.id}`}
                                className='text-night_green underline hover:text-brand_main'
                            >
                                {item.endCustomer.name}
                            </Link>
                        </Row>
                        <Row label='Регион ЛПУ' value={item.endCustomer.region} />
                        <Row label='Менеджер' value={fullName(item.manager)} />
                        <Row label='Дистрибьютор'>
                            <Link
                                href={`/crm/counterparties/${item.distributor.id}`}
                                className='text-night_green underline hover:text-brand_main'
                            >
                                {item.distributor.name}
                            </Link>
                        </Row>
                        <Row label='Регион дистрибьютора' value={item.distributor.region} />
                        <Row
                            label={`Сумма сделок по проекту${dealsCount ? ` (${dealsCount})` : ""}`}
                            value={formatMoney(dealsSum)}
                        />
                    </Section>

                    <section className='rounded-xl border border-brand_soft/40 bg-white/70 p-4'>
                        <h2 className='mb-2.5 text-xs font-semibold uppercase tracking-wide text-night_green/70'>
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

                    <section className='rounded-xl border border-brand_soft/40 bg-white/70 p-4'>
                        <h2 className='mb-2.5 text-xs font-semibold uppercase tracking-wide text-night_green/70'>
                            Сделки по проекту ({dealsCount})
                        </h2>
                        {item.deals.length === 0 ? (
                            <p className='text-sm text-night_green/55'>
                                Связанных сделок пока нет. Нажмите «Создать сделку» вверху
                                карточки — или привяжите существующую через поле
                                «Проект-источник» в её форме.
                            </p>
                        ) : (
                            <>
                            {/* Мобильные карточки */}
                            <div className='space-y-3 md:hidden'>
                                {item.deals.map(d => (
                                    <MobileCard key={d.id}>
                                        <div className='flex items-start justify-between gap-2'>
                                            <Link
                                                href={`/crm/deals/${d.id}`}
                                                className='min-w-0 font-medium text-night_green hover:text-brand_main'
                                            >
                                                {d.title || `Сделка с ${d.counterparty?.name || "клиентом"}`}
                                            </Link>
                                            <span className='shrink-0 rounded-full bg-brand_soft/40 px-2 py-0.5 text-xs font-medium text-night_green/80'>
                                                {DEAL_STATUS_LABELS[d.status] || d.status}
                                            </span>
                                        </div>
                                        <div className='mt-2 space-y-1'>
                                            <CardRow label='Клиент'>
                                                {d.counterparty?.name || "—"}
                                            </CardRow>
                                            <CardRow label='Менеджер'>{fullName(d.manager)}</CardRow>
                                            <CardRow label='Сумма'>
                                                <span className='font-medium text-gray-800'>
                                                    {formatMoney(d.totalAmount)}
                                                </span>
                                            </CardRow>
                                        </div>
                                    </MobileCard>
                                ))}
                            </div>

                            <div className='hidden overflow-x-auto rounded-lg border border-brand_soft/40 md:block'>
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
                            </>
                        )}
                    </section>
                </div>

                <ActivityPanel
                    entityType='Project'
                    entityId={item.id}
                    taskRelationKind='project'
                    currentUserId={session?.user?.id}
                    currentUserRole={session?.user?.role}
                    historyIncludeChildren
                />
            </div>
        </div>
    )
}

function Section({ title, footer, action, children }) {
    return (
        <section className='rounded-xl border border-brand_soft/40 bg-white/70 p-4'>
            <div className='mb-2.5 flex items-center justify-between gap-3'>
                <h2 className='text-xs font-semibold uppercase tracking-wide text-night_green/70'>
                    {title}
                </h2>
                {action && <div className='shrink-0'>{action}</div>}
            </div>
            <dl className='grid gap-x-4 gap-y-2.5 sm:grid-cols-2 lg:grid-cols-3'>{children}</dl>
            {footer && (
                <p className='mt-3 border-t border-brand_soft/30 pt-2 text-[11px] text-night_green/50'>
                    {footer}
                </p>
            )}
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
