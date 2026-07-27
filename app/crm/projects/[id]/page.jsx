import Link from "next/link"
import { notFound } from "next/navigation"
import { getServerSession } from "next-auth"
import { LuBuilding2, LuPencil, LuPlus, LuUser } from "react-icons/lu"
import { authOptions } from "@/configs/auth"
import prisma from "@/lib/client"
import { DEAL_STATUS_COLORS, DEAL_STATUS_LABELS } from "@/lib/crm/deal"
import { formatMoney } from "@/lib/crm/format"
import { isProjectLocked } from "@/lib/crm/access"
import ProjectStatusControl from "@/components/crm/ProjectStatusControl"
import ActivityPanel from "@/components/crm/ActivityPanel"
import ContactMeta from "@/components/crm/ContactMeta"
import CrmBackLink from "@/components/crm/CrmBackLink"
import LocalDateTime from "@/components/crm/LocalDateTime"
import { EntityHeading } from "@/components/crm/ui"

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
                // «Не реализована» (CANCELLED) не показываем в карточке проекта
                // и не учитываем в сумме/счётчике сделок.
                where: { status: { not: "CANCELLED" } },
                orderBy: { createdAt: "desc" },
                include: {
                    counterparty: { select: { id: true, name: true } },
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
                <div className='flex min-w-0 items-end justify-between gap-3'>
                    <EntityHeading
                        tone='blue'
                        label='Проект'
                        title={item.internalName}
                    />
                    {!locked && (
                        <Link
                            href={`/crm/projects/${item.id}/edit`}
                            className='inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1.5 text-sm font-medium text-neutral-700 transition hover:bg-surface_muted'
                        >
                            <LuPencil className='h-3.5 w-3.5' />
                            Редактировать
                        </Link>
                    )}
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
                                Сделки и аукционы ({dealsCount})
                            </h2>
                            {item.status !== "NO_NEED" && (
                                <SectionCreateButton
                                    href={`/crm/deals/new?fromProjectId=${item.id}`}
                                    label='Создать сделку/аукцион'
                                />
                            )}
                        </div>
                        {item.deals.length === 0 ? (
                            <p className='text-sm text-neutral-400'>
                                Связанных сделок пока нет. Нажмите «Создать сделку/аукцион» — или
                                привяжите существующую через поле «Проект-источник» в её
                                форме. Для аукциона отметьте галочку в форме сделки.
                            </p>
                        ) : (
                            <ul className='space-y-2'>
                                {item.deals.map(d => (
                                    <li key={d.id}>
                                        <Link
                                            href={`/crm/deals/${d.id}`}
                                            className='block rounded-lg border border-line px-3 py-2.5 transition hover:border-brand_main/40 hover:bg-surface_muted'
                                        >
                                            <div className='flex items-start justify-between gap-3'>
                                                <div className='min-w-0'>
                                                    <div className='flex items-center gap-2'>
                                                        {d.isAuction && <AuctionBadge />}
                                                        <p className='truncate text-sm font-medium text-neutral-900'>
                                                            {d.title ||
                                                                `Сделка с ${d.counterparty?.name || "клиентом"}`}
                                                        </p>
                                                    </div>
                                                    <div className='mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-neutral-500'>
                                                        <span className='inline-flex min-w-0 items-center gap-1'>
                                                            <LuBuilding2 className='h-3 w-3 shrink-0' />
                                                            <span className='truncate'>
                                                                {d.counterparty?.name || "—"}
                                                            </span>
                                                        </span>
                                                        <span className='inline-flex min-w-0 items-center gap-1'>
                                                            <LuUser className='h-3 w-3 shrink-0' />
                                                            <span className='truncate'>
                                                                {fullName(d.manager)}
                                                            </span>
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className='flex shrink-0 flex-col items-end gap-1'>
                                                    <span
                                                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                                                            DEAL_STATUS_COLORS[d.status] ||
                                                            "bg-neutral-100 text-neutral-500"
                                                        }`}
                                                    >
                                                        {DEAL_STATUS_LABELS[d.status] || d.status}
                                                    </span>
                                                    <span className='text-sm font-semibold text-neutral-900'>
                                                        {formatMoney(d.totalAmount)}
                                                    </span>
                                                </div>
                                            </div>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
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

// Компактный бейдж «Аукцион» для строк сделок-аукционов в списке проекта.
function AuctionBadge() {
    return (
        <span className='shrink-0 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700'>
            Аукцион
        </span>
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
            <div className='mt-1 space-y-0.5 text-sm text-neutral-500'>
                <p>
                    <span className='text-neutral-400'>Регион:</span> {org.region || "—"}
                </p>
                <p>
                    <span className='text-neutral-400'>Город:</span> {org.city || "—"}
                </p>
                <p>
                    <span className='text-neutral-400'>ИНН:</span> {org.inn || "—"}
                </p>
            </div>

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
