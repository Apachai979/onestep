import Link from "next/link"
import { notFound } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/configs/auth"
import prisma from "@/lib/client"
import { COUNTERPARTY_TYPE_LABELS } from "@/lib/crm/counterparty"
import { formatMoney, formatPercent } from "@/lib/crm/format"
import { PROJECT_STATUS_LABELS } from "@/lib/crm/project"
import ContactsSection from "@/components/crm/ContactsSection"
import RelatedTasksSection from "@/components/crm/RelatedTasksSection"
import ChangeHistorySection from "@/components/crm/ChangeHistorySection"

export const metadata = { title: "Контрагент | CRM" }

export default async function CounterpartyPage({ params }) {
    const session = await getServerSession(authOptions)
    const item = await prisma.counterparty.findUnique({
        where: { id: params.id },
        include: {
            createdBy: { select: { firstName: true, lastName: true, email: true } },
            updatedBy: { select: { firstName: true, lastName: true, email: true } },
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

    return (
        <div className='max-w-4xl space-y-6'>
            <div className='text-sm'>
                <Link href={backHref} className='text-gray-500 hover:text-primary_green'>
                    ← {backLabel}
                </Link>
            </div>
            <div className='flex items-start justify-between gap-4'>
                <div>
                    <p className='text-xs uppercase text-gray-500'>
                        {COUNTERPARTY_TYPE_LABELS[item.type]}
                    </p>
                    <h1 className='mt-1 text-2xl font-semibold text-night_green'>{item.name}</h1>
                </div>
                <Link
                    href={`/crm/counterparties/${item.id}/edit`}
                    className='rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100'
                >
                    Редактировать
                </Link>
            </div>

            <Section title='Основное'>
                <Row label='Регион' value={item.region} />
                <Row label='Телефон' value={item.phone} />
                <Row label='Email' value={item.email} />
                <Row label='Адрес' value={item.address} className='sm:col-span-2' />
            </Section>

            <ContactsSection counterpartyId={item.id} initialContacts={contactsForClient} />

            <RelatedTasksSection
                relationKind={item.type === "DISTRIBUTOR" ? "distributor" : "endCustomer"}
                relationId={item.id}
                currentUserId={session?.user?.id}
                currentUserRole={session?.user?.role}
            />

            <Section title='Реквизиты'>
                <Row label='ИНН' value={item.inn} />
                <Row label='КПП' value={item.kpp} />
                <Row label='ОГРН' value={item.ogrn} />
                <Row label='ОКПО' value={item.okpo} />
                <Row label='ОКВЭД' value={item.okved} className='sm:col-span-2' />
            </Section>

            <Section title='Банковские реквизиты'>
                <Row label='Название банка' value={item.bankName} className='sm:col-span-2' />
                <Row label='БИК' value={item.bik} />
                <Row label='Расчётный счёт' value={item.bankAccount} />
                <Row
                    label='Корреспондентский счёт'
                    value={item.bankCorrAccount}
                    className='sm:col-span-2'
                />
            </Section>

            <Section title='Финансы'>
                <Row label='Бюджет (сумма сделок)' value={formatMoney(item.totalRevenue)} />
                <Row label='Скидка клиента' value={formatPercent(item.discount)} />
            </Section>

            <section className='rounded-xl border border-gray-200 bg-white p-5'>
                <h2 className='mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500'>
                    История связок ({projects.length})
                </h2>
                {projects.length === 0 ? (
                    <p className='text-sm text-gray-400'>Проектов пока нет.</p>
                ) : (
                    <div className='overflow-x-auto rounded-lg border border-gray-100'>
                        <table className='w-full text-sm'>
                            <thead className='bg-gray-50 text-left text-xs uppercase text-gray-500'>
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
                                            className='border-t border-gray-100 hover:bg-gray-50'
                                        >
                                            <td className='px-3 py-2 text-gray-700'>
                                                {p.externalAuctionId}
                                            </td>
                                            <td className='px-3 py-2'>
                                                <Link
                                                    href={`/crm/projects/${p.id}`}
                                                    className='font-medium text-night_green hover:text-primary_green'
                                                >
                                                    {p.internalName}
                                                </Link>
                                            </td>
                                            <td className='px-3 py-2 text-gray-700'>
                                                {counter ? (
                                                    <Link
                                                        href={`/crm/counterparties/${counter.id}`}
                                                        className='hover:text-primary_green'
                                                    >
                                                        {counter.name}
                                                    </Link>
                                                ) : (
                                                    "—"
                                                )}
                                            </td>
                                            <td className='px-3 py-2 text-gray-700'>
                                                {p.manager
                                                    ? `${p.manager.firstName ?? ""} ${p.manager.lastName ?? ""}`.trim() ||
                                                      p.manager.email
                                                    : "—"}
                                            </td>
                                            <td className='px-3 py-2 text-gray-700'>
                                                {PROJECT_STATUS_LABELS[p.status]}
                                            </td>
                                            <td className='px-3 py-2 text-right text-gray-700'>
                                                {formatMoney(p.totalAmount)}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            <Section title='Служебное'>
                <Row label='Создал' value={createdByName} />
                <Row
                    label='Создан'
                    value={new Date(item.createdAt).toLocaleString("ru-RU")}
                />
                <Row label='Изменил' value={updatedByName || "—"} />
                <Row
                    label='Изменён'
                    value={new Date(item.updatedAt).toLocaleString("ru-RU")}
                />
            </Section>

            <ChangeHistorySection entityType='Counterparty' entityId={item.id} />

            {item.note && (
                <Section title='Примечание'>
                    <p className='whitespace-pre-wrap text-sm text-gray-800 sm:col-span-2'>
                        {item.note}
                    </p>
                </Section>
            )}
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
