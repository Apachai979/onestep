import Link from "next/link"
import { getServerSession } from "next-auth"
import { authOptions } from "@/configs/auth"
import prisma from "@/lib/client"
import {
    LuListTodo,
    LuBriefcase,
    LuTruck,
    LuAlertTriangle,
    LuActivity,
    LuArrowRight,
    LuClock,
    LuCheck,
    LuLink,
} from "react-icons/lu"
import {
    DEAL_STATUSES,
    DEAL_STATUS_COLORS,
    DEAL_STATUS_LABELS,
    autoArchiveStaleFinalDeals,
    dealDisplayTitle,
} from "@/lib/crm/deal"
import { SHIPMENT_STATUS_LABELS } from "@/lib/crm/shipment"
import { formatMoney } from "@/lib/crm/format"
import { CHANGE_ACTION_LABELS, ENTITY_LABELS } from "@/lib/crm/change-log"
import DashboardSearch from "@/components/crm/DashboardSearch"
import LocalDateTime from "@/components/crm/LocalDateTime"
import { Button, Card, StatCard, EmptyState } from "@/components/crm/ui"

export const metadata = { title: "Главная | CRM" }

function fullName(u) {
    if (!u) return "—"
    return `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email || "Система"
}

function fmtDate(d) {
    if (!d) return "—"
    return new Date(d).toLocaleDateString("ru-RU")
}

function fmtRelative(d) {
    const ms = Date.now() - new Date(d).getTime()
    const min = Math.floor(ms / 60_000)
    if (min < 1) return "только что"
    if (min < 60) return `${min} мин назад`
    const h = Math.floor(min / 60)
    if (h < 24) return `${h} ч назад`
    const days = Math.floor(h / 24)
    if (days < 7) return `${days} дн назад`
    return fmtDate(d)
}

function todayBounds() {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const end = new Date(start)
    end.setDate(end.getDate() + 1)
    return { start, end, now }
}

function isOverdueTask(t) {
    return t.status === "OPEN" && new Date(t.endAt).getTime() < Date.now()
}

function isTodayTask(t, { start, end }) {
    const s = new Date(t.startAt).getTime()
    const e = new Date(t.endAt).getTime()
    return s < end.getTime() && e >= start.getTime() && !isOverdueTask(t)
}

export default async function CrmHome() {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id
    const role = session?.user?.role
    const firstName = session?.user?.name?.split(" ")[0] || session?.user?.email || "коллега"
    const { start: dayStart, end: dayEnd, now } = todayBounds()

    // Ленивая архивация старых CLOSED/CANCELLED — до чтения сделок,
    // чтобы дашборд сразу увидел актуальные статусы.
    await autoArchiveStaleFinalDeals(prisma)

    // --- Parallel data load ---
    const [myOpenTasks, myDealsGrouped, myDealsList, overdueShipments, recentChanges] =
        await Promise.all([
            userId
                ? prisma.task.findMany({
                      where: { assigneeId: userId, status: "OPEN" },
                      orderBy: { endAt: "asc" },
                      take: 50,
                      include: {
                          deal: {
                              select: {
                                  id: true,
                                  title: true,
                                  counterparty: { select: { name: true } },
                              },
                          },
                          project: { select: { id: true, internalName: true } },
                          distributor: { select: { id: true, name: true } },
                          endCustomer: { select: { id: true, name: true } },
                      },
                  })
                : [],
            userId
                ? prisma.deal.groupBy({
                      by: ["status"],
                      where: { managerId: userId },
                      _count: { _all: true },
                      _sum: { totalAmount: true },
                  })
                : [],
            userId
                ? prisma.deal.findMany({
                      where: { managerId: userId },
                      orderBy: { updatedAt: "desc" },
                      take: 50,
                      select: {
                          id: true,
                          title: true,
                          status: true,
                          totalAmount: true,
                          counterparty: { select: { name: true } },
                      },
                  })
                : [],
            prisma.shipment.findMany({
                where: {
                    status: "DRAFT",
                    plannedDate: { lt: now, not: null },
                },
                orderBy: { plannedDate: "asc" },
                take: 8,
                include: {
                    deal: {
                        select: {
                            id: true,
                            title: true,
                            managerId: true,
                            counterparty: { select: { id: true, name: true } },
                        },
                    },
                },
            }),
            prisma.changeLog.findMany({
                orderBy: { createdAt: "desc" },
                take: 12,
                include: {
                    author: {
                        select: { firstName: true, lastName: true, email: true },
                    },
                },
            }),
        ])

    // --- Resolve entity names for activity feed (batched) ---
    const dealIds = new Set()
    const projectIds = new Set()
    const counterpartyIds = new Set()
    const auctionIds = new Set()
    for (const c of recentChanges) {
        // Дочерние записи (задачи, заметки, файлы, позиции) хранят родителя
        // прямо в parentEntityType/parentEntityId — берём его имя для ленты.
        const hasParent = !!(c.parentEntityType && c.parentEntityId)
        const targetEntity = hasParent ? c.parentEntityType : c.entityType
        const targetId = hasParent ? c.parentEntityId : c.entityId
        if (!targetEntity || !targetId) continue
        if (targetEntity === "Deal") dealIds.add(targetId)
        else if (targetEntity === "Project") projectIds.add(targetId)
        else if (targetEntity === "Counterparty") counterpartyIds.add(targetId)
        else if (targetEntity === "Auction") auctionIds.add(targetId)
    }
    const [dealMap, projectMap, counterpartyMap, auctionMap] = await Promise.all([
        dealIds.size
            ? prisma.deal
                  .findMany({
                      where: { id: { in: Array.from(dealIds) } },
                      select: {
                          id: true,
                          title: true,
                          counterparty: { select: { name: true } },
                      },
                  })
                  .then(arr => new Map(arr.map(d => [d.id, d])))
            : new Map(),
        projectIds.size
            ? prisma.project
                  .findMany({
                      where: { id: { in: Array.from(projectIds) } },
                      select: { id: true, internalName: true },
                  })
                  .then(arr => new Map(arr.map(p => [p.id, p])))
            : new Map(),
        counterpartyIds.size
            ? prisma.counterparty
                  .findMany({
                      where: { id: { in: Array.from(counterpartyIds) } },
                      select: { id: true, name: true },
                  })
                  .then(arr => new Map(arr.map(c => [c.id, c])))
            : new Map(),
        auctionIds.size
            ? prisma.auction
                  .findMany({
                      where: { id: { in: Array.from(auctionIds) } },
                      select: { id: true, purchaseNumber: true },
                  })
                  .then(arr => new Map(arr.map(a => [a.id, a])))
            : new Map(),
    ])

    // --- Derived data ---
    const overdueTasks = myOpenTasks.filter(isOverdueTask)
    const todayTasks = myOpenTasks.filter(t => isTodayTask(t, { start: dayStart, end: dayEnd }))

    const dealsListByStatus = {}
    for (const s of DEAL_STATUSES) dealsListByStatus[s] = []
    for (const d of myDealsList) {
        if (dealsListByStatus[d.status]) dealsListByStatus[d.status].push(d)
    }
    const dealStatusStats = {}
    for (const s of DEAL_STATUSES) dealStatusStats[s] = { count: 0, sum: 0 }
    for (const g of myDealsGrouped) {
        if (!dealStatusStats[g.status]) continue
        dealStatusStats[g.status].count = g._count?._all || 0
        dealStatusStats[g.status].sum = Number(g._sum?.totalAmount || 0)
    }

    const activeDeals = DEAL_STATUSES.filter(s => s !== "ARCHIVED" && s !== "CANCELLED").reduce(
        (acc, s) => acc + (dealStatusStats[s]?.count || 0),
        0
    )

    // --- KPIs ---
    const kpis = [
        {
            label: "Открытых задач",
            value: myOpenTasks.length,
            href: "/crm/tasks",
            icon: LuListTodo,
            tone: "neutral",
        },
        {
            label: "Просрочено",
            value: overdueTasks.length,
            href: "/crm/tasks",
            icon: LuAlertTriangle,
            tone: overdueTasks.length > 0 ? "danger" : "neutral",
        },
        {
            label: "Сделок в работе",
            value: activeDeals,
            href: "/crm/deals",
            icon: LuBriefcase,
            tone: "neutral",
        },
        {
            label: "Просрочки отгрузок",
            value: overdueShipments.length,
            href: "/crm/shipments",
            icon: LuTruck,
            tone: overdueShipments.length > 0 ? "warn" : "neutral",
        },
    ]

    return (
        <div className='space-y-4 sm:space-y-5'>
            {/* Header */}
            <div className='flex flex-wrap items-center justify-between gap-3'>
                <div className='shrink-0'>
                    <p className='text-xs uppercase tracking-wider text-neutral-400'>
                        <LocalDateTime format='weekday' />
                    </p>
                    <h1 className='mt-1 text-xl font-semibold tracking-tight text-neutral-900 sm:text-2xl'>
                        Привет, {firstName} 👋
                    </h1>
                </div>
                <div className='order-last w-full min-w-[240px] lg:order-none lg:mx-2 lg:w-auto lg:max-w-xl lg:flex-1'>
                    <DashboardSearch />
                </div>
                <div className='flex flex-wrap gap-2'>
                    <Button href='/crm/deals/new'>
                        <LuBriefcase className='h-4 w-4' />
                        Новая сделка
                    </Button>
                    <Button href='/crm/projects/new' variant='secondary'>
                        <LuLink className='h-4 w-4' />
                        Новый проект
                    </Button>
                </div>
            </div>

            {/* KPIs */}
            <div className='grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4'>
                {kpis.map(k => (
                    <StatCard key={k.label} {...k} />
                ))}
            </div>

            {/* Row 1: My tasks */}
            <Widget title='Мои задачи' icon={LuListTodo} href='/crm/tasks' action='Все задачи'>
                {overdueTasks.length === 0 && todayTasks.length === 0 ? (
                    <EmptyState
                        icon={LuCheck}
                        title='Всё под контролем'
                        hint='Просроченных и сегодняшних задач нет.'
                    />
                ) : (
                    <div className='space-y-4'>
                        {overdueTasks.length > 0 && (
                            <TaskGroup
                                title={`Просрочено · ${overdueTasks.length}`}
                                tone='danger'
                                tasks={overdueTasks.slice(0, 4)}
                            />
                        )}
                        {todayTasks.length > 0 && (
                            <TaskGroup
                                title={`На сегодня · ${todayTasks.length}`}
                                tone='warn'
                                tasks={todayTasks.slice(0, 4)}
                            />
                        )}
                    </div>
                )}
            </Widget>

            {/* Row 2: Mini-kanban — my deals by status */}
            <Widget
                title='Мои сделки по статусам'
                icon={LuBriefcase}
                href='/crm/deals'
                action='Канбан / Список'
            >
                {Object.values(dealStatusStats).every(s => s.count === 0) ? (
                    <EmptyState
                        icon={LuBriefcase}
                        title='Сделок пока нет'
                        hint='Создайте новую сделку — она появится здесь.'
                    />
                ) : (
                    <div className='grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6'>
                        {DEAL_STATUSES.map(s => {
                            const stat = dealStatusStats[s] || { count: 0, sum: 0 }
                            const recent = (dealsListByStatus[s] || []).slice(0, 2)
                            return (
                                <Link
                                    key={s}
                                    href='/crm/deals'
                                    className='group flex flex-col rounded-xl border border-line bg-white p-3 shadow-sm transition-all duration-200 hover:border-line_strong hover:shadow-md'
                                >
                                    <div
                                        className={`inline-flex w-fit rounded-full px-2 py-0.5 text-[10px] font-medium ${DEAL_STATUS_COLORS[s]}`}
                                    >
                                        {DEAL_STATUS_LABELS[s]}
                                    </div>
                                    <p className='mt-2 text-2xl font-semibold text-neutral-900'>
                                        {stat.count}
                                    </p>
                                    <p className='text-[11px] text-neutral-500'>
                                        {formatMoney(stat.sum)}
                                    </p>
                                    {recent.length > 0 && (
                                        <ul className='mt-2 hidden space-y-0.5 border-t border-line pt-2 text-[11px] text-neutral-500 sm:block'>
                                            {recent.map(d => (
                                                <li key={d.id} className='truncate'>
                                                    {dealDisplayTitle(d, d.counterparty?.name)}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </Link>
                            )
                        })}
                    </div>
                )}
            </Widget>

            {/* Row 3: Shipments + Activity feed */}
            <div className='grid gap-4 lg:grid-cols-2'>
                <Widget
                    title='Просроченные отгрузки'
                    icon={LuTruck}
                    href='/crm/shipments'
                    action='Все отгрузки'
                >
                    {overdueShipments.length === 0 ? (
                        <EmptyState
                            icon={LuCheck}
                            title='Просрочек нет'
                            hint='Все плановые даты отгрузок ещё впереди.'
                        />
                    ) : (
                        <ul className='space-y-2'>
                            {overdueShipments.map(sh => {
                                const mine = sh.deal?.managerId === userId
                                return (
                                    <li key={sh.id}>
                                        <Link
                                            href={`/crm/shipments/${sh.id}`}
                                            className='flex items-start justify-between gap-3 rounded-lg border border-red-200/60 bg-red-50/40 p-3 hover:bg-red-50'
                                        >
                                            <div className='min-w-0 flex-1'>
                                                <div className='flex items-center gap-2'>
                                                    <span className='font-mono text-sm font-semibold text-neutral-900'>
                                                        {sh.number}
                                                    </span>
                                                    {mine && (
                                                        <span className='rounded-full bg-brand_main/10 px-1.5 py-0.5 text-[10px] font-semibold text-brand_main'>
                                                            моя
                                                        </span>
                                                    )}
                                                </div>
                                                <p className='mt-0.5 truncate text-xs text-neutral-500'>
                                                    {sh.deal?.counterparty?.name || "—"}
                                                </p>
                                            </div>
                                            <div className='shrink-0 text-right'>
                                                <p className='text-xs font-semibold text-red-700'>
                                                    <LocalDateTime value={sh.plannedDate} format='date' />
                                                </p>
                                                <p className='text-[10px] text-neutral-400'>
                                                    {SHIPMENT_STATUS_LABELS[sh.status]}
                                                </p>
                                            </div>
                                        </Link>
                                    </li>
                                )
                            })}
                        </ul>
                    )}
                </Widget>

                <Widget title='Последняя активность' icon={LuActivity}>
                    {recentChanges.length === 0 ? (
                        <EmptyState
                            icon={LuActivity}
                            title='Изменений пока нет'
                            hint='История появится по мере работы в CRM.'
                        />
                    ) : (
                        <ul className='space-y-1.5'>
                            {recentChanges.map(c => {
                                const entry = describeChange(c, {
                                    dealMap,
                                    projectMap,
                                    counterpartyMap,
                                    auctionMap,
                                })
                                return (
                                    <li
                                        key={c.id}
                                        className='flex items-start gap-2 rounded-lg border border-line bg-surface_muted p-2 text-xs'
                                    >
                                        <span
                                            className={`mt-1 inline-flex h-1.5 w-1.5 shrink-0 rounded-full ${entry.dotClass}`}
                                        />
                                        <div className='min-w-0 flex-1'>
                                            <p className='text-neutral-800'>
                                                <span className='font-medium'>
                                                    {fullName(c.author)}
                                                </span>{" "}
                                                <span className='text-neutral-500'>
                                                    {entry.actionText}
                                                </span>{" "}
                                                {entry.targetHref ? (
                                                    <Link
                                                        href={entry.targetHref}
                                                        className='font-medium text-brand_main hover:underline'
                                                    >
                                                        {entry.targetText}
                                                    </Link>
                                                ) : (
                                                    <span className='font-medium'>
                                                        {entry.targetText}
                                                    </span>
                                                )}
                                            </p>
                                            <p className='text-[10px] text-neutral-400'>
                                                {fmtRelative(c.createdAt)} ·{" "}
                                                <LocalDateTime value={c.createdAt} />
                                            </p>
                                        </div>
                                    </li>
                                )
                            })}
                        </ul>
                    )}
                </Widget>
            </div>
        </div>
    )
}

// === helpers ===

// Предлог для связки «дочерняя сущность → карточка-родитель»:
// «задача по проекту», но «позиция в сделке».
const PARENT_PREPOSITION = { Task: "по", Email: "по" }

function describeChange(c, { dealMap, projectMap, counterpartyMap, auctionMap }) {
    const isChild = !!(c.parentEntityType && c.parentEntityId)
    const parent = isChild ? c.parentEntityType : c.entityType
    const parentId = isChild ? c.parentEntityId : c.entityId
    const entityLabel = ENTITY_LABELS[c.entityType] || c.entityType
    const action = CHANGE_ACTION_LABELS[c.action] || c.action

    let targetText = entityLabel
    let targetHref = null

    if (parent === "Deal" && parentId) {
        const d = dealMap.get(parentId)
        if (d) {
            targetText = d.title || `Сделка с ${d.counterparty?.name || "клиентом"}`
            targetHref = `/crm/deals/${parentId}`
        }
    } else if (parent === "Project" && parentId) {
        const p = projectMap.get(parentId)
        if (p) {
            targetText = p.internalName
            targetHref = `/crm/projects/${parentId}`
        }
    } else if (parent === "Counterparty" && parentId) {
        const cp = counterpartyMap.get(parentId)
        if (cp) {
            targetText = cp.name
            targetHref = `/crm/counterparties/${parentId}`
        }
    } else if (parent === "Auction" && parentId) {
        const a = auctionMap.get(parentId)
        if (a) {
            targetText = a.purchaseNumber ? `Закупка № ${a.purchaseNumber}` : "Аукцион"
            targetHref = `/crm/auctions/${parentId}`
        }
    }

    // Если имя родителя не нашли (карточка удалена) — прежний вид «создано Задача».
    const parentResolved = targetHref !== null
    const actionText =
        isChild && parentResolved
            ? `${action.toLowerCase()} ${entityLabel.toLowerCase()} ${
                  PARENT_PREPOSITION[c.entityType] || "в"
              }`
            : `${action.toLowerCase()}`

    const dotClass =
        c.action === "CREATE"
            ? "bg-green-500"
            : c.action === "DELETE"
              ? "bg-red-500"
              : "bg-brand_main"

    return { targetText, targetHref, actionText, dotClass }
}

// === presentational components ===

function Widget({ title, icon: Icon, href, action, children }) {
    return (
        <Card padding='md'>
            <div className='mb-4 flex items-center justify-between'>
                <h2 className='flex items-center gap-2 text-sm font-semibold text-neutral-900'>
                    <Icon className='h-4 w-4 text-brand_main' />
                    {title}
                </h2>
                {href && (
                    <Link
                        href={href}
                        className='inline-flex items-center gap-1 text-xs font-medium text-brand_main transition-colors hover:text-brand_main/80'
                    >
                        {action || "Открыть"}
                        <LuArrowRight className='h-3 w-3' />
                    </Link>
                )}
            </div>
            {children}
        </Card>
    )
}

function TaskGroup({ title, tone, tasks }) {
    const toneClass =
        tone === "danger"
            ? "border-red-200 bg-red-50/50"
            : tone === "warn"
              ? "border-amber-200 bg-amber-50/50"
              : "border-line bg-surface_muted"
    const titleClass =
        tone === "danger"
            ? "text-red-700"
            : tone === "warn"
              ? "text-amber-800"
              : "text-neutral-500"
    return (
        <div className={`rounded-xl border ${toneClass} p-3`}>
            <p className={`mb-2 text-xs font-semibold uppercase ${titleClass}`}>{title}</p>
            <ul className='space-y-1.5'>
                {tasks.map(t => (
                    <li key={t.id}>
                        <Link
                            href='/crm/tasks'
                            className='flex items-start justify-between gap-3 rounded-lg bg-white p-2 text-sm shadow-sm transition-colors hover:bg-surface_muted'
                        >
                            <div className='min-w-0 flex-1'>
                                <p className='truncate font-medium text-neutral-900'>{t.title}</p>
                                <p className='truncate text-[11px] text-neutral-500'>
                                    {relationLabel(t)}
                                </p>
                            </div>
                            <div className='shrink-0 text-right text-[11px] text-neutral-500'>
                                <span className='inline-flex items-center gap-1'>
                                    <LuClock className='h-3 w-3' />
                                    <LocalDateTime value={t.endAt} />
                                </span>
                            </div>
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    )
}

function relationLabel(t) {
    if (t.deal) return `Сделка: ${t.deal.title || t.deal.counterparty?.name || "—"}`
    if (t.project) return `Проект: ${t.project.internalName}`
    if (t.auction) return `Аукцион: ${t.auction.purchaseNumber ? `закупка № ${t.auction.purchaseNumber}` : "—"}`
    if (t.distributor) return `Дистрибьютор: ${t.distributor.name}`
    if (t.endCustomer) return `Клиент: ${t.endCustomer.name}`
    return "Без связи"
}
