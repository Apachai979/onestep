import Link from "next/link"
import { notFound } from "next/navigation"
import { getServerSession } from "next-auth"
import { LuPencil } from "react-icons/lu"
import { authOptions } from "@/configs/auth"
import prisma from "@/lib/client"
import {
    ACTIVITY_AREA_LABELS,
    COMPANY_KIND_LABELS,
    COUNTERPARTY_SOURCE_LABELS,
    COUNTERPARTY_TYPE_LABELS,
} from "@/lib/crm/counterparty"
import { formatMoney, formatPercent } from "@/lib/crm/format"
import { PROJECT_STATUS_LABELS } from "@/lib/crm/project"
import ContactsSection from "@/components/crm/ContactsSection"
import ActivityPanel from "@/components/crm/ActivityPanel"
import CrmBackLink from "@/components/crm/CrmBackLink"
import LocalDateTime from "@/components/crm/LocalDateTime"
import PhoneLink from "@/components/crm/PhoneLink"

export const metadata = { title: "Контрагент | CRM" }

export default async function CounterpartyPage({ params }) {
    const session = await getServerSession(authOptions)
    const item = await prisma.counterparty.findUnique({
        where: { id: params.id },
        include: {
            createdBy: { select: { firstName: true, lastName: true, email: true } },
            updatedBy: { select: { firstName: true, lastName: true, email: true } },
            manager: { select: { firstName: true, lastName: true, email: true } },
            contacts: { orderBy: [{ isPrimary: "desc" }, { lastName: "asc" }, { firstName: "asc" }] },
        },
    })
    if (!item) notFound()

    const projectsRelation =
        item.type === "DISTRIBUTOR"
            ? { distributorId: item.id }
            : { endCustomerId: item.id }
    const projects = await prisma.project.findMany({
        where: projectsRelation,
        orderBy: { createdAt: "desc" },
        include: {
            distributor: { select: { id: true, name: true } },
            endCustomer: { select: { id: true, name: true } },
            manager: { select: { firstName: true, lastName: true, email: true } },
        },
    })

    const contactsForClient = item.contacts.map(c => ({
        ...c,
        birthDate: c.birthDate ? c.birthDate.toISOString() : null,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
    }))

    const backHref = item.type === "DISTRIBUTOR" ? "/crm/distributors" : "/crm/customers"
    const backLabel =
        item.type === "DISTRIBUTOR" ? "Дистрибьюторы" : "Конечные потребители"

    const createdByName = item.createdBy
        ? `${item.createdBy.firstName ?? ""} ${item.createdBy.lastName ?? ""}`.trim() ||
          item.createdBy.email
        : "—"

    const updatedByName = item.updatedBy
        ? `${item.updatedBy.firstName ?? ""} ${item.updatedBy.lastName ?? ""}`.trim() ||
          item.updatedBy.email
        : null

    const taskRelationKind =
        item.type === "DISTRIBUTOR" ? "distributor" : "endCustomer"

    return (
        <div className='space-y-4'>
            <CrmBackLink
                fallback={backHref}
                fallbackLabel={backLabel}
                className='inline-flex items-center gap-1 text-xs text-neutral-400 hover:text-brand_main'
            />

            <div className='flex flex-wrap items-start justify-between gap-3'>
                <div className='min-w-0'>
                    <p className='text-xs uppercase tracking-wider text-neutral-400'>
                        {COUNTERPARTY_TYPE_LABELS[item.type]}
                    </p>
                    <h1 className='mt-0.5 text-xl font-semibold text-neutral-900 sm:text-2xl'>
                        {item.name}
                    </h1>
                    <p className='mt-1 text-sm text-neutral-500'>
                        {[item.region, item.inn && `ИНН ${item.inn}`]
                            .filter(Boolean)
                            .join(" · ")}
                    </p>
                </div>
            </div>

            <div className='grid grid-cols-[minmax(0,1fr)] items-start gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(360px,1fr)]'>
                <div className='min-w-0 space-y-4'>
                    <Section
                        title='Основное'
                        action={
                            <Link
                                href={`/crm/counterparties/${item.id}/edit`}
                                className='inline-flex items-center gap-1 rounded-md border border-line bg-white px-2 py-1 text-[11px] font-medium text-neutral-900/75 hover:bg-surface_muted'
                            >
                                <LuPencil className='h-3 w-3' />
                                Редактировать
                            </Link>
                        }
                        footer={
                            <>
                                Создал {createdByName} · <LocalDateTime value={item.createdAt} />
                                {updatedByName && (
                                    <>
                                        {" · "}изменил {updatedByName} ·{" "}
                                        <LocalDateTime value={item.updatedAt} />
                                    </>
                                )}
                            </>
                        }
                    >
                        <Row label='Регион' value={item.region} />
                        <Row
                            label='Телефон'
                            value={item.phone ? <PhoneLink phone={item.phone} /> : null}
                        />
                        <Row label='Email' value={item.email} />
                        <Row
                            label='Ответственный менеджер'
                            value={
                                item.manager
                                    ? `${item.manager.firstName ?? ""} ${item.manager.lastName ?? ""}`.trim() ||
                                      item.manager.email
                                    : null
                            }
                        />
                        <Row
                            label='Адрес'
                            value={item.address}
                            className='sm:col-span-2 lg:col-span-2'
                        />
                        <Row
                            label='Источник'
                            value={COUNTERPARTY_SOURCE_LABELS[item.source] || null}
                        />
                        {item.type === "END_CUSTOMER" && (
                            <>
                                <Row
                                    label='Тип компании'
                                    value={COMPANY_KIND_LABELS[item.companyKind] || null}
                                />
                                <Row
                                    label='Сфера деятельности'
                                    value={ACTIVITY_AREA_LABELS[item.activityArea] || null}
                                />
                            </>
                        )}
                    </Section>

                    <Section title='Реквизиты и финансы'>
                        <Row label='ИНН' value={item.inn} />
                        <Row label='КПП' value={item.kpp} />
                        <Row label='ОГРН' value={item.ogrn} />
                        <Row label='ОКПО' value={item.okpo} />
                        <Row label='ОКВЭД' value={item.okved} />
                        <Row label='БИК' value={item.bik} />
                        <Row label='Расчётный счёт' value={item.bankAccount} />
                        <Row
                            label='Корреспондентский счёт'
                            value={item.bankCorrAccount}
                        />
                        <Row label='Название банка' value={item.bankName} />
                        <Row
                            label='Бюджет (сумма сделок)'
                            value={formatMoney(item.totalRevenue)}
                        />
                        <Row label='Скидка клиента' value={formatPercent(item.discount)} />
                    </Section>

                    <ContactsSection
                        counterpartyId={item.id}
                        initialContacts={contactsForClient}
                    />

                    <section className='rounded-xl border border-line bg-white p-4'>
                        <h2 className='mb-2.5 text-xs font-semibold uppercase tracking-wide text-neutral-500'>
                            История связок ({projects.length})
                        </h2>
                        {projects.length === 0 ? (
                            <p className='text-sm text-neutral-400'>Проектов пока нет.</p>
                        ) : (
                            <>
                                {/* Карточки для мобильных */}
                                <ul className='space-y-2 md:hidden'>
                                    {projects.map(p => {
                                        const counter =
                                            item.type === "DISTRIBUTOR"
                                                ? p.endCustomer
                                                : p.distributor
                                        const managerName = p.manager
                                            ? `${p.manager.firstName ?? ""} ${p.manager.lastName ?? ""}`.trim() ||
                                              p.manager.email
                                            : "—"
                                        return (
                                            <li
                                                key={p.id}
                                                className='rounded-lg border border-line p-3'
                                            >
                                                <div className='flex items-start justify-between gap-2'>
                                                    <Link
                                                        href={`/crm/projects/${p.id}`}
                                                        className='font-medium text-neutral-900 hover:text-brand_main'
                                                    >
                                                        {p.internalName}
                                                    </Link>
                                                    <span className='shrink-0 text-right text-sm font-medium text-neutral-900/75'>
                                                        {formatMoney(p.totalAmount)}
                                                    </span>
                                                </div>
                                                <dl className='mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-2 gap-y-1 text-xs'>
                                                    <dt className='text-neutral-400'>Аукцион</dt>
                                                    <dd className='text-neutral-900/75'>
                                                        {p.externalAuctionId || "—"}
                                                    </dd>
                                                    <dt className='text-neutral-400'>
                                                        {item.type === "DISTRIBUTOR"
                                                            ? "Конечный потребитель"
                                                            : "Дистрибьютор"}
                                                    </dt>
                                                    <dd className='min-w-0 text-neutral-900/75'>
                                                        {counter ? (
                                                            <Link
                                                                href={`/crm/counterparties/${counter.id}`}
                                                                className='hover:text-brand_main'
                                                            >
                                                                {counter.name}
                                                            </Link>
                                                        ) : (
                                                            "—"
                                                        )}
                                                    </dd>
                                                    <dt className='text-neutral-400'>Менеджер</dt>
                                                    <dd className='text-neutral-900/75'>
                                                        {managerName}
                                                    </dd>
                                                    <dt className='text-neutral-400'>Статус</dt>
                                                    <dd className='text-neutral-900/75'>
                                                        {PROJECT_STATUS_LABELS[p.status]}
                                                    </dd>
                                                </dl>
                                            </li>
                                        )
                                    })}
                                </ul>

                                {/* Таблица для планшетов и десктопа */}
                                <div className='hidden overflow-x-auto rounded-lg border border-line md:block'>
                                    <table className='w-full text-sm'>
                                        <thead className='bg-surface_muted text-left text-xs uppercase tracking-wider text-neutral-500'>
                                            <tr>
                                                <th className='px-3 py-2'>Аукцион</th>
                                                <th className='px-3 py-2'>Проект</th>
                                                <th className='px-3 py-2'>
                                                    {item.type === "DISTRIBUTOR"
                                                        ? "Конечный потребитель"
                                                        : "Дистрибьютор"}
                                                </th>
                                                <th className='px-3 py-2'>Менеджер</th>
                                                <th className='px-3 py-2'>Статус</th>
                                                <th className='px-3 py-2 text-right'>Сумма</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {projects.map(p => {
                                                const counter =
                                                    item.type === "DISTRIBUTOR"
                                                        ? p.endCustomer
                                                        : p.distributor
                                                return (
                                                    <tr
                                                        key={p.id}
                                                        className='border-t border-line hover:bg-surface_muted'
                                                    >
                                                        <td className='px-3 py-2 text-neutral-900/75'>
                                                            {p.externalAuctionId}
                                                        </td>
                                                        <td className='px-3 py-2'>
                                                            <Link
                                                                href={`/crm/projects/${p.id}`}
                                                                className='font-medium text-neutral-900 hover:text-brand_main'
                                                            >
                                                                {p.internalName}
                                                            </Link>
                                                        </td>
                                                        <td className='px-3 py-2 text-neutral-900/75'>
                                                            {counter ? (
                                                                <Link
                                                                    href={`/crm/counterparties/${counter.id}`}
                                                                    className='hover:text-brand_main'
                                                                >
                                                                    {counter.name}
                                                                </Link>
                                                            ) : (
                                                                "—"
                                                            )}
                                                        </td>
                                                        <td className='px-3 py-2 text-neutral-900/75'>
                                                            {p.manager
                                                                ? `${p.manager.firstName ?? ""} ${p.manager.lastName ?? ""}`.trim() ||
                                                                  p.manager.email
                                                                : "—"}
                                                        </td>
                                                        <td className='px-3 py-2 text-neutral-900/75'>
                                                            {PROJECT_STATUS_LABELS[p.status]}
                                                        </td>
                                                        <td className='px-3 py-2 text-right text-neutral-900/75'>
                                                            {formatMoney(p.totalAmount)}
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </section>

                    {item.note && (
                        <Section title='Примечание'>
                            <p className='whitespace-pre-wrap text-sm text-neutral-700 sm:col-span-2 lg:col-span-3'>
                                {item.note}
                            </p>
                        </Section>
                    )}
                </div>

                <ActivityPanel
                    entityType='Counterparty'
                    entityId={item.id}
                    taskRelationKind={taskRelationKind}
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

function Row({ label, value, className = "" }) {
    return (
        <div className={className}>
            <dt className='text-[10px] uppercase tracking-wider text-neutral-400'>
                {label}
            </dt>
            <dd className='mt-0.5 text-sm text-neutral-900'>{value || "—"}</dd>
        </div>
    )
}
