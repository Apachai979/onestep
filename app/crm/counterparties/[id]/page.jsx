import Link from "next/link"
import { notFound } from "next/navigation"
import { getServerSession } from "next-auth"
import { LuBuilding2, LuPencil, LuUser } from "react-icons/lu"
import { authOptions } from "@/configs/auth"
import prisma from "@/lib/client"
import {
    ACTIVITY_AREA_LABELS,
    COMPANY_KIND_LABELS,
    COUNTERPARTY_SOURCE_LABELS,
    COUNTERPARTY_TYPE_LABELS,
    websiteHref,
} from "@/lib/crm/counterparty"
import { formatMoney, formatPercent } from "@/lib/crm/format"
import { PROJECT_STATUS_COLORS, PROJECT_STATUS_LABELS } from "@/lib/crm/project"
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

    const managerName = item.manager
        ? `${item.manager.firstName ?? ""} ${item.manager.lastName ?? ""}`.trim() ||
          item.manager.email
        : "—"

    const taskRelationKind =
        item.type === "DISTRIBUTOR" ? "distributor" : "endCustomer"

    return (
        <div className='space-y-4'>
            <CrmBackLink
                fallback={backHref}
                fallbackLabel={backLabel}
                className='inline-flex items-center gap-1 text-xs text-neutral-400 hover:text-brand_main'
            />

            <div className='grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(360px,1fr)]'>
                <div className='flex flex-wrap items-start justify-between gap-4'>
                    <div className='min-w-0'>
                        <div className='flex flex-wrap items-center gap-2'>
                            <h1 className='text-xl font-semibold text-neutral-900 sm:text-2xl'>
                                {item.name}
                            </h1>
                            <span className='rounded-full bg-brand_main/10 px-2.5 py-0.5 text-xs font-medium text-brand_main'>
                                {COUNTERPARTY_TYPE_LABELS[item.type]}
                            </span>
                        </div>
                        <p className='mt-1 text-sm text-neutral-500'>
                            {[
                                item.region,
                                item.inn && `ИНН ${item.inn}`,
                                item.manager && `Менеджер ${managerName}`,
                            ]
                                .filter(Boolean)
                                .join(" · ")}
                        </p>
                    </div>
                    <div className='flex items-center gap-4 sm:gap-5'>
                        <div className='text-right'>
                            <p className='text-[10px] uppercase tracking-wider text-neutral-400'>
                                Бюджет
                            </p>
                            <p className='mt-0.5 text-lg font-semibold text-brand_main'>
                                {formatMoney(item.totalRevenue)}
                            </p>
                        </div>
                        <div className='h-9 w-px bg-line' />
                        <div className='text-right'>
                            <p className='text-[10px] uppercase tracking-wider text-neutral-400'>
                                Скидка
                            </p>
                            <p className='mt-0.5 text-lg font-semibold text-neutral-900'>
                                {formatPercent(item.discount)}
                            </p>
                        </div>
                        <Link
                            href={`/crm/counterparties/${item.id}/edit`}
                            className='inline-flex items-center gap-1.5 self-end rounded-lg border border-line bg-white px-2.5 py-1.5 text-sm font-medium text-neutral-700 transition hover:bg-surface_muted'
                        >
                            <LuPencil className='h-3.5 w-3.5' />
                            Изменить
                        </Link>
                    </div>
                </div>
            </div>

            <div className='grid grid-cols-[minmax(0,1fr)] items-start gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(360px,1fr)]'>
                <div className='min-w-0 space-y-4'>
                    <Section
                        title='Основное'
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
                        <Row label='Город' value={item.city} />
                        <Row
                            label='Телефон'
                            value={item.phone ? <PhoneLink phone={item.phone} /> : null}
                        />
                        <Row label='Email' value={item.email} />
                        <Row
                            label='Веб-сайт'
                            value={
                                item.website ? (
                                    <a
                                        href={websiteHref(item.website)}
                                        target='_blank'
                                        rel='noreferrer noopener'
                                        className='break-all text-brand_main hover:underline'
                                    >
                                        {item.website}
                                    </a>
                                ) : null
                            }
                        />
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

                    <section className='rounded-xl border border-line bg-white p-4'>
                        <h2 className='mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500'>
                            Связи{projects.length > 0 ? ` · ${projects.length}` : ""}
                        </h2>
                        {projects.length === 0 ? (
                            <p className='text-sm text-neutral-400'>Проектов пока нет.</p>
                        ) : (
                            <div>
                                {/* Узел-контрагент */}
                                <div className='flex items-center'>
                                    <span className='h-3 w-3 shrink-0 rounded-full bg-brand_main ring-4 ring-brand_main/15' />
                                </div>
                                {/* Ветви к проектам */}
                                <ul className='ml-[5px] border-l border-line'>
                                    {projects.map(p => {
                                        const managerName = p.manager
                                            ? `${p.manager.firstName ?? ""} ${p.manager.lastName ?? ""}`.trim() ||
                                              p.manager.email
                                            : "—"
                                        const counter =
                                            item.type === "DISTRIBUTOR"
                                                ? p.endCustomer
                                                : p.distributor
                                        return (
                                            <li key={p.id} className='relative pl-6 pt-3'>
                                                <span className='absolute left-0 top-8 h-px w-6 bg-line' />
                                                <Link
                                                    href={`/crm/projects/${p.id}`}
                                                    className='block rounded-lg border border-line px-3 py-2.5 transition hover:border-brand_main/40 hover:bg-surface_muted'
                                                >
                                                    <div className='flex items-start justify-between gap-3'>
                                                        <div className='min-w-0'>
                                                            <div className='flex items-center gap-2'>
                                                                <span
                                                                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                                                                        PROJECT_STATUS_COLORS[p.status] ||
                                                                        "bg-neutral-100 text-neutral-500"
                                                                    }`}
                                                                >
                                                                    <span className='h-1.5 w-1.5 rounded-full bg-current' />
                                                                    {PROJECT_STATUS_LABELS[p.status]}
                                                                </span>
                                                                <p className='truncate text-sm font-medium text-neutral-900'>
                                                                    {p.internalName}
                                                                </p>
                                                            </div>
                                                            <div className='mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-neutral-500'>
                                                                <span className='inline-flex min-w-0 items-center gap-1'>
                                                                    <LuUser className='h-3 w-3 shrink-0' />
                                                                    <span className='truncate'>
                                                                        {managerName}
                                                                    </span>
                                                                </span>
                                                                {counter && (
                                                                    <span className='inline-flex min-w-0 items-center gap-1'>
                                                                        <LuBuilding2 className='h-3 w-3 shrink-0' />
                                                                        <span className='truncate'>
                                                                            {counter.name}
                                                                        </span>
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <span className='shrink-0 text-sm font-semibold text-neutral-900'>
                                                            {formatMoney(p.totalAmount)}
                                                        </span>
                                                    </div>
                                                </Link>
                                            </li>
                                        )
                                    })}
                                </ul>
                            </div>
                        )}
                    </section>

                    <ContactsSection
                        counterpartyId={item.id}
                        initialContacts={contactsForClient}
                    />

                    <Section title='Реквизиты и финансы'>
                        <Row label='ИНН' value={item.inn} />
                        <Row label='КПП' value={item.kpp} />
                        <Row label='ОГРН' value={item.ogrn} />
                        <Row label='ОКПО' value={item.okpo} />
                        <Row label='ОКВЭД' value={item.okved} />
                        <Row label='БИК' value={item.bik} />
                        <Row label='Расчётный счёт' value={item.bankAccount} />
                        <Row label='Корреспондентский счёт' value={item.bankCorrAccount} />
                        <Row label='Название банка' value={item.bankName} />
                    </Section>

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
