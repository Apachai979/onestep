import Link from "next/link"
import { notFound } from "next/navigation"
import { getServerSession } from "next-auth"
import { LuBuilding2, LuChevronDown, LuPencil, LuUser } from "react-icons/lu"
import { authOptions } from "@/configs/auth"
import prisma from "@/lib/client"
import {
    ACTIVITY_AREA_LABELS,
    COMPANY_KIND_LABELS,
    COUNTERPARTY_SOURCE_LABELS,
    COUNTERPARTY_TYPE_LABELS,
    websiteHref,
} from "@/lib/crm/counterparty"
import {
    DEAL_STATUS_COLORS,
    DEAL_STATUS_LABELS,
    dealDiscountedTotal,
    dealDisplayTitle,
    dealOwnTitle,
} from "@/lib/crm/deal"
import { formatMoney, formatPercent } from "@/lib/crm/format"
import { PROJECT_STATUS_COLORS, PROJECT_STATUS_LABELS } from "@/lib/crm/project"
import { attachClosedRevenue, closedRevenueFor } from "@/lib/crm/revenue"
import ContactsSection from "@/components/crm/ContactsSection"
import CounterpartyGroupSection from "@/components/crm/CounterpartyGroupSection"
import CounterpartyTypeSwitch from "@/components/crm/CounterpartyTypeSwitch"
import ActivityPanel from "@/components/crm/ActivityPanel"
import CrmBackLink from "@/components/crm/CrmBackLink"
import LocalDateTime from "@/components/crm/LocalDateTime"
import PhoneLink from "@/components/crm/PhoneLink"

export const metadata = { title: "Контрагент | CRM" }

// Сколько строк (проекты + сделки) дерево показывает развёрнутым по умолчанию.
const TREE_OPEN_LIMIT = 8

export default async function CounterpartyPage({ params }) {
    const session = await getServerSession(authOptions)
    const item = await prisma.counterparty.findUnique({
        where: { id: params.id },
        include: {
            createdBy: { select: { firstName: true, lastName: true, email: true } },
            updatedBy: { select: { firstName: true, lastName: true, email: true } },
            manager: { select: { firstName: true, lastName: true, email: true } },
            contacts: { orderBy: [{ isPrimary: "desc" }, { lastName: "asc" }, { firstName: "asc" }] },
            group: {
                include: {
                    members: {
                        orderBy: { name: "asc" },
                        select: {
                            id: true,
                            name: true,
                            type: true,
                            inn: true,
                            kpp: true,
                            region: true,
                            totalRevenue: true,
                            isGroupPrimary: true,
                        },
                    },
                },
            },
        },
    })
    if (!item) notFound()

    // Контрагент мог сменить тип (конечный потребитель ↔ дистрибьютор), поэтому
    // берём проекты по обеим ролям — иначе прошлые связи пропали бы из карточки.
    const projects = await prisma.project.findMany({
        where: { OR: [{ distributorId: item.id }, { endCustomerId: item.id }] },
        orderBy: { createdAt: "desc" },
        include: {
            distributor: { select: { id: true, name: true } },
            endCustomer: { select: { id: true, name: true } },
            manager: { select: { firstName: true, lastName: true, email: true } },
        },
    })

    // Сделки контрагента — там, где он клиент или плательщик (документы
    // оформлены на него, а покупает другое юрлицо группы). Роль заказчика
    // аукциона сюда намеренно не входит: сделку ведут с поставщиком.
    const deals = await prisma.deal.findMany({
        where: { OR: [{ counterpartyId: item.id }, { payerId: item.id }] },
        orderBy: { createdAt: "desc" },
        include: {
            counterparty: { select: { id: true, name: true } },
            manager: { select: { firstName: true, lastName: true, email: true } },
            sourceProject: { select: { id: true, internalName: true } },
        },
    })

    // Сделки вешаем ветками под их проект. Проект сделки может не быть проектом
    // этого контрагента (например, он в ней только плательщик) — такие сделки
    // уходят в общую группу внизу, название проекта показываем в подписи.
    const projectIds = new Set(projects.map(p => p.id))
    const dealsByProject = new Map()
    const looseDeals = []
    for (const d of deals) {
        if (d.sourceProjectId && projectIds.has(d.sourceProjectId)) {
            const list = dealsByProject.get(d.sourceProjectId) || []
            list.push(d)
            dealsByProject.set(d.sourceProjectId, list)
        } else {
            looseDeals.push(d)
        }
    }

    // Короткое дерево показываем сразу — сворачивать там нечего; длинное
    // открывается по клику, чтобы карточка не начиналась с двух экранов истории.
    const treeOpenByDefault = projects.length + deals.length <= TREE_OPEN_LIMIT

    // Оборот — факт по закрытым сделкам, считается на лету. Для группы нужен
    // оборот каждого юрлица, для карточки — только свой.
    if (item.group) await attachClosedRevenue(prisma, item.group)
    const closedRevenue = item.group
        ? (item.group.members.find(m => m.id === item.id)?.closedRevenue ?? 0)
        : await closedRevenueFor(prisma, item.id)

    const contactsForClient = item.contacts.map(c => ({
        ...c,
        birthDate: c.birthDate ? c.birthDate.toISOString() : null,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
    }))

    // Decimal не сериализуется в клиентский компонент — приводим к строке.
    const groupForClient = item.group
        ? {
              id: item.group.id,
              name: item.group.name,
              discount: item.group.discount != null ? item.group.discount.toString() : null,
              note: item.group.note,
              members: item.group.members.map(m => ({
                  ...m,
                  totalRevenue: m.totalRevenue.toString(),
              })),
          }
        : null

    // Скидка группы перекрывает личную: иначе клиент получил бы условия получше,
    // просто оформив сделку на другое своё юрлицо.
    const groupDiscount = item.group?.discount ?? null
    const shownDiscount = groupDiscount ?? item.discount
    const groupBudget = item.group
        ? item.group.members.reduce((acc, m) => acc + Number(m.totalRevenue || 0), 0)
        : null
    const groupRevenue = item.group
        ? item.group.members.reduce((acc, m) => acc + Number(m.closedRevenue || 0), 0)
        : null
    // Подпись «группа ...» под цифрой нужна, только если юрлиц действительно
    // несколько — иначе она дублирует саму цифру.
    const showGroupTotals = Boolean(item.group && item.group.members.length > 1)

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
                        {item.group && (
                            <p className='mt-1.5 inline-flex flex-wrap items-center gap-1.5 rounded-lg bg-surface_muted px-2 py-1 text-xs text-neutral-600'>
                                <LuBuilding2 className='h-3.5 w-3.5 text-neutral-400' />
                                Входит в «{item.group.name}»
                                {item.group.members.length > 1 && (
                                    <span className='text-neutral-400'>
                                        · ещё {pluralEntities(item.group.members.length - 1)}
                                    </span>
                                )}
                            </p>
                        )}
                    </div>
                    <div className='flex items-center gap-4 sm:gap-5'>
                        <div className='text-right'>
                            <p className='text-[10px] uppercase tracking-wider text-neutral-400'>
                                Бюджет
                            </p>
                            <p className='mt-0.5 text-lg font-semibold text-brand_main'>
                                {formatMoney(item.totalRevenue)}
                            </p>
                            {showGroupTotals && (
                                <p className='text-[11px] text-neutral-400'>
                                    группа {formatMoney(groupBudget)}
                                </p>
                            )}
                        </div>
                        <div className='h-9 w-px bg-line' />
                        {/* Оборот — факт по закрытым сделкам, руками не правится:
                            рядом с бюджетом (планом) сразу видно, насколько
                            клиент выбран. */}
                        <div className='text-right'>
                            <p className='text-[10px] uppercase tracking-wider text-neutral-400'>
                                Оборот
                            </p>
                            <p
                                className='mt-0.5 text-lg font-semibold text-neutral-900'
                                title='Сумма закрытых сделок с учётом скидки'
                            >
                                {formatMoney(closedRevenue)}
                            </p>
                            {showGroupTotals && (
                                <p className='text-[11px] text-neutral-400'>
                                    группа {formatMoney(groupRevenue)}
                                </p>
                            )}
                        </div>
                        <div className='h-9 w-px bg-line' />
                        <div className='text-right'>
                            <p className='text-[10px] uppercase tracking-wider text-neutral-400'>
                                Скидка
                            </p>
                            <p className='mt-0.5 text-lg font-semibold text-neutral-900'>
                                {formatPercent(shownDiscount)}
                            </p>
                            {groupDiscount != null && (
                                <p className='text-[11px] text-neutral-400'>из группы</p>
                            )}
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

                {/* Смена роли — в правом верхнем углу страницы, на одной линии
                    с заголовком (на узких экранах уезжает под него). */}
                <div className='flex justify-end'>
                    <CounterpartyTypeSwitch id={item.id} name={item.name} type={item.type} />
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

                    {/* Сворачивается нативным <details>: у давнего клиента дерево
                        разрастается на несколько экранов и отодвигает контакты
                        с реквизитами. Клиентский компонент ради этого не нужен —
                        состояние держит браузер. */}
                    <details
                        open={treeOpenByDefault}
                        className='group rounded-xl border border-line bg-white p-4'
                    >
                        <summary className='flex cursor-pointer list-none flex-wrap items-center justify-between gap-x-3 gap-y-1 [&::-webkit-details-marker]:hidden'>
                            <h2 className='text-xs font-semibold uppercase tracking-wide text-neutral-500'>
                                Проекты и сделки
                            </h2>
                            <span className='flex items-center gap-1.5 text-[11px] text-neutral-400'>
                                {(projects.length > 0 || deals.length > 0) && (
                                    <span>
                                        {pluralProjects(projects.length)} ·{" "}
                                        {pluralDeals(deals.length)}
                                    </span>
                                )}
                                <LuChevronDown className='h-4 w-4 transition group-open:rotate-180' />
                            </span>
                        </summary>
                        <div className='mt-3'>
                        {projects.length === 0 && deals.length === 0 ? (
                            <p className='text-sm text-neutral-400'>
                                Проектов и сделок пока нет.
                            </p>
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
                                            p.distributorId === item.id
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
                                                {(dealsByProject.get(p.id) || []).length > 0 && (
                                                    <ul className='ml-3 border-l border-line'>
                                                        {dealsByProject.get(p.id).map(d => (
                                                            <DealBranch
                                                                key={d.id}
                                                                deal={d}
                                                                counterpartyId={item.id}
                                                            />
                                                        ))}
                                                    </ul>
                                                )}
                                            </li>
                                        )
                                    })}

                                    {looseDeals.length > 0 && (
                                        <li className='relative pl-6 pt-3'>
                                            <span className='absolute left-0 top-5 h-px w-6 bg-line' />
                                            <p className='text-[11px] uppercase tracking-wider text-neutral-400'>
                                                Без проекта
                                            </p>
                                            <ul className='ml-3 border-l border-line'>
                                                {looseDeals.map(d => (
                                                    <DealBranch
                                                        key={d.id}
                                                        deal={d}
                                                        counterpartyId={item.id}
                                                        showProject
                                                    />
                                                ))}
                                            </ul>
                                        </li>
                                    )}
                                </ul>
                            </div>
                        )}
                        </div>
                    </details>

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

                    <CounterpartyGroupSection
                        counterpartyId={item.id}
                        counterpartyName={item.name}
                        counterpartyType={item.type}
                        initialGroup={groupForClient}
                    />


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

// Ветка-сделка в дереве проектов. Под проектом название собираем без подстановки
// проекта (dealOwnTitle) — иначе каждая ветка повторяла бы имя родителя.
function DealBranch({ deal, counterpartyId, showProject = false }) {
    const managerName = deal.manager
        ? `${deal.manager.firstName ?? ""} ${deal.manager.lastName ?? ""}`.trim() ||
          deal.manager.email
        : "—"
    // Контрагент не клиент сделки — значит попал сюда как плательщик.
    const asPayer = deal.counterpartyId !== counterpartyId
    const title = showProject
        ? dealDisplayTitle(deal, deal.counterparty?.name)
        : dealOwnTitle(deal, deal.counterparty?.name)

    return (
        <li className='relative pl-5 pt-2'>
            <span className='absolute left-0 top-[22px] h-px w-5 bg-line' />
            <Link
                href={`/crm/deals/${deal.id}`}
                className='block rounded-lg border border-line px-2.5 py-2 transition hover:border-brand_main/40 hover:bg-surface_muted'
            >
                <div className='flex items-start justify-between gap-3'>
                    <div className='min-w-0'>
                        <div className='flex flex-wrap items-center gap-1.5'>
                            <span
                                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                                    DEAL_STATUS_COLORS[deal.status] ||
                                    "bg-neutral-100 text-neutral-500"
                                }`}
                            >
                                <span className='h-1.5 w-1.5 rounded-full bg-current' />
                                {DEAL_STATUS_LABELS[deal.status] || deal.status}
                            </span>
                            {deal.isAuction && (
                                <span className='shrink-0 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700'>
                                    Аукцион
                                </span>
                            )}
                            {asPayer && (
                                <span
                                    className='shrink-0 rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-500'
                                    title='Документы оформлены на этого контрагента'
                                >
                                    Плательщик
                                </span>
                            )}
                            <p className='truncate text-sm text-neutral-900'>{title}</p>
                        </div>
                        <div className='mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-neutral-500'>
                            <span className='inline-flex min-w-0 items-center gap-1'>
                                <LuUser className='h-3 w-3 shrink-0' />
                                <span className='truncate'>{managerName}</span>
                            </span>
                            {asPayer && deal.counterparty && (
                                <span className='inline-flex min-w-0 items-center gap-1'>
                                    <LuBuilding2 className='h-3 w-3 shrink-0' />
                                    <span className='truncate'>{deal.counterparty.name}</span>
                                </span>
                            )}
                        </div>
                    </div>
                    <span
                        className='shrink-0 text-sm font-medium text-neutral-900'
                        title={
                            Number(deal.discount) > 0
                                ? `Сумма со скидкой ${Number(deal.discount)}% (без скидки ${formatMoney(deal.totalAmount)})`
                                : undefined
                        }
                    >
                        {formatMoney(dealDiscountedTotal(deal))}
                    </span>
                </div>
            </Link>
        </li>
    )
}

function pluralProjects(n) {
    const mod10 = n % 10
    const mod100 = n % 100
    if (mod10 === 1 && mod100 !== 11) return `${n} проект`
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} проекта`
    return `${n} проектов`
}

function pluralDeals(n) {
    const mod10 = n % 10
    const mod100 = n % 100
    if (mod10 === 1 && mod100 !== 11) return `${n} сделка`
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} сделки`
    return `${n} сделок`
}

function pluralEntities(n) {
    const mod10 = n % 10
    const mod100 = n % 100
    if (mod10 === 1 && mod100 !== 11) return `${n} юрлицо`
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} юрлица`
    return `${n} юрлиц`
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
