import Link from "next/link"
import { notFound } from "next/navigation"
import { getServerSession } from "next-auth"
import { LuPencil, LuPlus } from "react-icons/lu"
import { authOptions } from "@/configs/auth"
import prisma from "@/lib/client"
import { DEAL_STATUS_LABELS } from "@/lib/crm/deal"
import { AUCTION_STATUS_COLORS, AUCTION_STATUS_LABELS } from "@/lib/crm/auction"
import { formatMoney } from "@/lib/crm/format"
import { isProjectLocked } from "@/lib/crm/access"
import { CardRow, MobileCard } from "@/components/crm/ui/MobileCards"
import ProjectStatusControl from "@/components/crm/ProjectStatusControl"
import ActivityPanel from "@/components/crm/ActivityPanel"
import ContactMeta from "@/components/crm/ContactMeta"
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
            auctions: {
                orderBy: { createdAt: "desc" },
                include: {
                    manager: { select: { firstName: true, lastName: true, email: true } },
                },
            },
        },
    })
    if (!item) notFound()

    // «Проработано, нет потребности»: менеджеру карточка только для чтения.
    const locked = isProjectLocked(item.status, session)

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
                className='inline-flex items-center gap-1 text-xs text-neutral-400 hover:text-brand_main'
            />

            {/* Шапка повторяет колонки тела страницы: статус стоит в правой
                колонке над панелью активности, как на карточке сделки. */}
            <div className='grid grid-cols-[minmax(0,1fr)] items-stretch gap-x-4 gap-y-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(360px,1fr)]'>
                <div className='min-w-0'>
                    <p className='text-xs uppercase tracking-wider text-neutral-400'>
                        Проект
                    </p>
                    <h1 className='mt-0.5 text-xl font-semibold text-neutral-900 sm:text-2xl'>
                        {item.internalName}
                    </h1>
                </div>
                <div className='flex flex-wrap items-end justify-between gap-2'>
                    <ProjectStatusControl
                        projectId={item.id}
                        currentStatus={item.status}
                        readOnly={locked}
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

            {item.status === "NO_NEED" && item.lossComment && (
                <div className='rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm'>
                    <p className='text-xs font-semibold uppercase tracking-wide text-amber-800'>
                        Нет потребности — причина
                    </p>
                    <p className='mt-1 whitespace-pre-wrap text-amber-900'>{item.lossComment}</p>
                </div>
            )}

            {locked && (
                <div className='rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-600'>
                    Проект проработан — карточка доступна только для просмотра. Работать
                    можно с заметками, задачами и файлами; изменения вносит администратор.
                </div>
            )}

            <div className='grid grid-cols-[minmax(0,1fr)] items-start gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(360px,1fr)]'>
                <div className='min-w-0 space-y-4'>
                    <Section
                        title='Проект'
                        action={
                            locked ? null : (
                                <Link
                                    href={`/crm/projects/${item.id}/edit`}
                                    className='inline-flex items-center gap-1 rounded-md border border-line bg-white px-2 py-1 text-[11px] font-medium text-neutral-900/75 hover:bg-surface_muted'
                                >
                                    <LuPencil className='h-3 w-3' />
                                    Редактировать
                                </Link>
                            )
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
                        <Row label='Ответственный менеджер' value={fullName(item.manager)} />
                        <Row
                            label={`Сумма сделок по проекту${dealsCount ? ` (${dealsCount})` : ""}`}
                            value={formatMoney(dealsSum)}
                        />
                    </Section>

                    {/* Две самодостаточные карточки сторон: организация + регион + контакты */}
                    <div className='grid gap-4 sm:grid-cols-2'>
                        <PartyCard
                            label='Конечный потребитель'
                            org={item.endCustomer}
                            contacts={contactsByCounterparty[item.endCustomerId]}
                        />
                        <PartyCard
                            label='Дистрибьютор'
                            org={item.distributor}
                            contacts={contactsByCounterparty[item.distributorId]}
                        />
                    </div>

                    <section className='rounded-xl border border-line bg-white p-4'>
                        <div className='mb-2.5 flex items-center justify-between gap-3'>
                            <h2 className='text-xs font-semibold uppercase tracking-wide text-neutral-500'>
                                Сделки по проекту ({dealsCount})
                            </h2>
                            {item.status !== "NO_NEED" && (
                                <SectionCreateButton
                                    href={`/crm/deals/new?fromProjectId=${item.id}`}
                                    label='Создать сделку'
                                />
                            )}
                        </div>
                        {item.deals.length === 0 ? (
                            <p className='text-sm text-neutral-400'>
                                Связанных сделок пока нет. Нажмите «Создать сделку» — или
                                привяжите существующую через поле «Проект-источник» в её
                                форме.
                            </p>
                        ) : (
                            <>
                            {/* Мобильные карточки */}
                            <div className='space-y-3 md:hidden'>
                                {item.deals.map(d => (
                                    <Link
                                        key={d.id}
                                        href={`/crm/deals/${d.id}`}
                                        className='block transition hover:bg-surface_muted'
                                    >
                                        <MobileCard>
                                        <div className='flex items-start justify-between gap-2'>
                                            <span className='min-w-0 font-medium text-neutral-900'>
                                                {d.title || `Сделка с ${d.counterparty?.name || "клиентом"}`}
                                            </span>
                                            <span className='shrink-0 rounded-full bg-surface_muted px-2 py-0.5 text-xs font-medium text-neutral-700'>
                                                {DEAL_STATUS_LABELS[d.status] || d.status}
                                            </span>
                                        </div>
                                        <div className='mt-2 space-y-1'>
                                            <CardRow label='Клиент'>
                                                {d.counterparty?.name || "—"}
                                            </CardRow>
                                            <CardRow label='Менеджер'>{fullName(d.manager)}</CardRow>
                                            <CardRow label='Сумма'>
                                                <span className='font-medium text-neutral-800'>
                                                    {formatMoney(d.totalAmount)}
                                                </span>
                                            </CardRow>
                                        </div>
                                        </MobileCard>
                                    </Link>
                                ))}
                            </div>

                            <div className='hidden overflow-x-auto rounded-lg border border-line md:block'>
                                <table className='w-full text-sm'>
                                    <thead className='bg-surface_muted text-left text-xs uppercase tracking-wider text-neutral-500'>
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
                                                className='border-t border-line hover:bg-surface_muted'
                                            >
                                                <td className='p-0'>
                                                    <Link
                                                        href={`/crm/deals/${d.id}`}
                                                        className='block px-3 py-2 font-medium text-neutral-900'
                                                    >
                                                        {d.title || `Сделка с ${d.counterparty?.name || "клиентом"}`}
                                                    </Link>
                                                </td>
                                                <td className='p-0 text-neutral-900/75'>
                                                    <Link href={`/crm/deals/${d.id}`} className='block px-3 py-2'>
                                                        {d.counterparty?.name || "—"}
                                                    </Link>
                                                </td>
                                                <td className='p-0 text-neutral-900/75'>
                                                    <Link href={`/crm/deals/${d.id}`} className='block px-3 py-2'>
                                                        {fullName(d.manager)}
                                                    </Link>
                                                </td>
                                                <td className='p-0 text-neutral-900/75'>
                                                    <Link href={`/crm/deals/${d.id}`} className='block px-3 py-2'>
                                                        {DEAL_STATUS_LABELS[d.status] || d.status}
                                                    </Link>
                                                </td>
                                                <td className='p-0 text-neutral-900/75'>
                                                    <Link href={`/crm/deals/${d.id}`} className='block px-3 py-2 text-right'>
                                                        {formatMoney(d.totalAmount)}
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            </>
                        )}
                    </section>

                    <section className='rounded-xl border border-line bg-white p-4'>
                        <div className='mb-2.5 flex items-center justify-between gap-3'>
                            <h2 className='text-xs font-semibold uppercase tracking-wide text-neutral-500'>
                                Аукционы по проекту ({item.auctions.length})
                            </h2>
                            {item.status !== "NO_NEED" && (
                                <SectionCreateButton
                                    href={`/crm/auctions/new?fromProjectId=${item.id}`}
                                    label='Создать аукцион'
                                />
                            )}
                        </div>
                        {item.auctions.length === 0 ? (
                            <p className='text-sm text-neutral-400'>
                                Аукционов пока нет. Нажмите «Создать аукцион» — заказчик и
                                поставщик подставятся из проекта.
                            </p>
                        ) : (
                            <>
                            {/* Мобильные карточки */}
                            <div className='space-y-3 md:hidden'>
                                {item.auctions.map(a => (
                                    <Link
                                        key={a.id}
                                        href={`/crm/auctions/${a.id}`}
                                        className='block transition hover:bg-surface_muted'
                                    >
                                        <MobileCard>
                                        <div className='flex items-start justify-between gap-2'>
                                            <span className='min-w-0 font-medium text-neutral-900'>
                                                {a.purchaseNumber
                                                    ? `Закупка № ${a.purchaseNumber}`
                                                    : "Аукцион"}
                                            </span>
                                            <span
                                                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${AUCTION_STATUS_COLORS[a.status] || ""}`}
                                            >
                                                {AUCTION_STATUS_LABELS[a.status] || a.status}
                                            </span>
                                        </div>
                                        <div className='mt-2 space-y-1'>
                                            <CardRow label='НМЦК'>
                                                <span className='font-medium text-neutral-800'>
                                                    {formatMoney(a.nmck)}
                                                </span>
                                            </CardRow>
                                            <CardRow label='Аукцион'>
                                                <LocalDateTime value={a.auctionAt} />
                                            </CardRow>
                                            <CardRow label='Менеджер'>{fullName(a.manager)}</CardRow>
                                        </div>
                                        </MobileCard>
                                    </Link>
                                ))}
                            </div>

                            <div className='hidden overflow-x-auto rounded-lg border border-line md:block'>
                                <table className='w-full text-sm'>
                                    <thead className='bg-surface_muted text-left text-xs uppercase tracking-wider text-neutral-500'>
                                        <tr>
                                            <th className='px-3 py-2'>Закупка</th>
                                            <th className='px-3 py-2'>Статус</th>
                                            <th className='px-3 py-2'>Аукцион</th>
                                            <th className='px-3 py-2'>Менеджер</th>
                                            <th className='px-3 py-2 text-right'>НМЦК</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {item.auctions.map(a => (
                                            <tr
                                                key={a.id}
                                                className='border-t border-line hover:bg-surface_muted'
                                            >
                                                <td className='p-0'>
                                                    <Link
                                                        href={`/crm/auctions/${a.id}`}
                                                        className='block px-3 py-2 font-medium text-neutral-900'
                                                    >
                                                        {a.purchaseNumber
                                                            ? `№ ${a.purchaseNumber}`
                                                            : "Аукцион"}
                                                    </Link>
                                                </td>
                                                <td className='p-0'>
                                                    <Link href={`/crm/auctions/${a.id}`} className='block px-3 py-2'>
                                                        <span
                                                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${AUCTION_STATUS_COLORS[a.status] || ""}`}
                                                        >
                                                            {AUCTION_STATUS_LABELS[a.status] || a.status}
                                                        </span>
                                                    </Link>
                                                </td>
                                                <td className='p-0 text-neutral-900/75'>
                                                    <Link href={`/crm/auctions/${a.id}`} className='block px-3 py-2'>
                                                        <LocalDateTime value={a.auctionAt} />
                                                    </Link>
                                                </td>
                                                <td className='p-0 text-neutral-900/75'>
                                                    <Link href={`/crm/auctions/${a.id}`} className='block px-3 py-2'>
                                                        {fullName(a.manager)}
                                                    </Link>
                                                </td>
                                                <td className='p-0 text-neutral-900/75'>
                                                    <Link href={`/crm/auctions/${a.id}`} className='block px-3 py-2 text-right'>
                                                        {formatMoney(a.nmck)}
                                                    </Link>
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

// Единый стиль кнопок создания на рамках секций («Создать сделку»,
// «Создать аукцион»).
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

// Самодостаточная карточка стороны сделки/проекта: заголовок роли,
// организация (ссылка), регион и список её контактов — всё в одном месте,
// чтобы структура считывалась за один взгляд.
function PartyCard({ label, org, contacts }) {
    return (
        <section className='flex flex-col rounded-xl border border-line bg-white p-4'>
            <p className='text-[10px] font-medium uppercase tracking-wider text-neutral-400'>
                {label}
            </p>
            <Link
                href={`/crm/counterparties/${org.id}`}
                className='mt-1 block text-base font-semibold leading-snug text-neutral-900 hover:text-brand_main'
            >
                {org.name}
            </Link>
            <p className='mt-1 text-sm text-neutral-500'>
                <span className='text-neutral-400'>Регион:</span> {org.region || "—"}
            </p>

            <div className='my-3 h-px bg-line' />

            <p className='mb-2 text-[10px] font-medium uppercase tracking-wider text-neutral-400'>
                Контакты
            </p>
            {contacts.length === 0 ? (
                <p className='text-sm text-neutral-400'>Не выбраны.</p>
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
                                className='rounded-lg border border-line bg-surface_muted px-3 py-2 text-sm'
                            >
                                <p className='font-medium text-neutral-900'>{name}</p>
                                <ContactMeta contact={c} />
                            </li>
                        )
                    })}
                </ul>
            )}
        </section>
    )
}
