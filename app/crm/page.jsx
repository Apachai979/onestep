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
import {
    SHIPMENT_STATUS_LABELS,
} from "@/lib/crm/shipment"
import { formatMoney } from "@/lib/crm/format"
import { CHANGE_ACTION_LABELS, ENTITY_LABELS, CHILD_OF } from "@/lib/crm/change-log"

export const metadata = { title: "Главная | CRM" }

function fullName(u) {
    if (!u) return "—"
    return `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email || "Система"
}

function fmtDate(d) {
    if (!d) return "—"
    return new Date(d).toLocaleDateString("ru-RU")
}

function fmtDateTime(d) {
    if (!d) return "—"
    return new Date(d).toLocaleString("ru-RU", {
        dateStyle: "short",
        timeStyle: "short",
    })
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
    const firstName =
        session?.user?.name?.split(" ")[0] || session?.user?.email || "коллега"
    const { start: dayStart, end: dayEnd, now } = todayBounds()

    // Ленивая архивация старых CLOSED/CANCELLED — до чтения сделок,
    // чтобы дашборд сразу увидел актуальные статусы.
    await autoArchiveStaleFinalDeals(prisma)

    // --- Parallel data load ---
    const [
        myOpenTasks,
        myDealsGrouped,
        myDealsList,
        overdueShipments,
        recentChanges,
    ] = await Promise.all([
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
    for (const c of recentChanges) {
        const isChild = !!CHILD_OF[c.entityType]
        const targetEntity = isChild ? c.parentEntityType : c.entityType
        const targetId = isChild ? c.parentEntityId : c.entityId
        if (!targetEntity || !targetId) continue
        if (targetEntity === "Deal") dealIds.add(targetId)
        else if (targetEntity === "Project") projectIds.add(targetId)
        else if (targetEntity === "Counterparty") counterpartyIds.add(targetId)
    }
    const [dealMap, projectMap, counterpartyMap] = await Promise.all([
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
    ])

    // --- Derived data ---
    const overdueTasks = myOpenTasks.filter(isOverdueTask)
    const todayTasks = myOpenTasks.filter(t =>
        isTodayTask(t, { start: dayStart, end: dayEnd }),
    )

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

    const activeDeals = DEAL_STATUSES.filter(
        s => s !== "ARCHIVED" && s !== "CANCELLED",
    ).reduce((acc, s) => acc + (dealStatusStats[s]?.count || 0), 0)

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
        <div className='space-y-6'>
            {/* Header */}
            <div className='flex flex-wrap items-end justify-between gap-3'>
                <div>
                    <p className='text-xs uppercase tracking-wider text-night_green/55'>
                        {new Date().toLocaleDateString("ru-RU", {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                        })}
                    </p>
                    <h1 className='mt-1 text-2xl font-semibold text-night_green sm:text-3xl'>
                        Привет, {firstName} 👋
                    </h1>
                </div>
                <div className='flex flex-wrap gap-2'>
                    <Link
                        href='/crm/deals/new'
                        className='inline-flex items-center gap-2 rounded-lg bg-brand_main px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand_main/90'
                    >
                        <LuBriefcase className='h-4 w-4' />
                        Новая сделка
                    </Link>
                    <Link
                        href='/crm/projects/new'
                        className='inline-flex items-center gap-2 rounded-lg border border-brand_soft/60 bg-white/70 px-3 py-2 text-sm font-medium text-night_green hover:bg-brand_soft/30'
                    >
                        <LuLink className='h-4 w-4' />
                        Новый проект
                    </Link>
                </div>
            </div>

            {/* KPIs */}
            <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
                {kpis.map(k => (
                    <KpiTile key={k.label} {...k} />
                ))}
            </div>

            {/* Row 1: My tasks */}
            <Widget
                title='Мои задачи'
                icon={LuListTodo}
                href='/crm/tasks'
                action='Все задачи'
            >
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
                    <div className='grid gap-2 sm:grid-cols-3 lg:grid-cols-6'>
                        {DEAL_STATUSES.map(s => {
                            const stat = dealStatusStats[s] || { count: 0, sum: 0 }
                            const recent = (dealsListByStatus[s] || []).slice(0, 2)
                            return (
                                <Link
                                    key={s}
                                    href='/crm/deals'
                                    className='group flex flex-col rounded-lg border border-brand_soft/40 bg-white/70 p-3 transition hover:border-brand_main/40 hover:bg-white'
                                >
                                    <div
                                        className={`inline-flex w-fit rounded-full px-2 py-0.5 text-[10px] font-medium ${DEAL_STATUS_COLORS[s]}`}
                                    >
                                        {DEAL_STATUS_LABELS[s]}
                                    </div>
                                    <p className='mt-2 text-2xl font-semibold text-night_green'>
                                        {stat.count}
                                    </p>
                                    <p className='text-[11px] text-night_green/55'>
                                        {formatMoney(stat.sum)}
                                    </p>
                                    {recent.length > 0 && (
                                        <ul className='mt-2 space-y-0.5 border-t border-brand_soft/30 pt-2 text-[11px] text-night_green/70'>
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
                                                    <span className='font-mono text-sm font-semibold text-night_green'>
                                                        {sh.number}
                                                    </span>
                                                    {mine && (
                                                        <span className='rounded-full bg-brand_main/15 px-1.5 py-0.5 text-[10px] font-semibold text-brand_main'>
                                                            моя
                                                        </span>
                                                    )}
                                                </div>
                                                <p className='mt-0.5 truncate text-xs text-night_green/70'>
                                                    {sh.deal?.counterparty?.name || "—"}
                                                </p>
                                            </div>
                                            <div className='shrink-0 text-right'>
                                                <p className='text-xs font-semibold text-red-700'>
                                                    {fmtDate(sh.plannedDate)}
                                                </p>
                                                <p className='text-[10px] text-night_green/55'>
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
                                })
                                return (
                                    <li
                                        key={c.id}
                                        className='flex items-start gap-2 rounded-md border border-brand_soft/30 bg-white/50 p-2 text-xs'
                                    >
                                        <span
                                            className={`mt-1 inline-flex h-1.5 w-1.5 shrink-0 rounded-full ${entry.dotClass}`}
                                        />
                                        <div className='min-w-0 flex-1'>
                                            <p className='text-night_green'>
                                                <span className='font-medium'>
                                                    {fullName(c.author)}
                                                </span>{" "}
                                                <span className='text-night_green/65'>
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
                                            <p className='text-[10px] text-night_green/45'>
                                                {fmtRelative(c.createdAt)} ·{" "}
                                                {fmtDateTime(c.createdAt)}
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

function describeChange(c, { dealMap, projectMap, counterpartyMap }) {
    const isChild = !!CHILD_OF[c.entityType]
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
    }

    const actionText = isChild
        ? `${action.toLowerCase()} ${entityLabel.toLowerCase()} в`
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

function KpiTile({ label, value, href, icon: Icon, tone }) {
    const toneClass =
        tone === "danger"
            ? "border-red-200 bg-red-50/60 text-red-700"
            : tone === "warn"
              ? "border-amber-200 bg-amber-50/60 text-amber-700"
              : "border-brand_soft/50 bg-white/70 text-night_green"
    return (
        <Link
            href={href}
            className={`group flex items-center justify-between rounded-xl border ${toneClass} p-4 transition hover:shadow-sm hover:shadow-brand_main/10`}
        >
            <div>
                <p className='text-[11px] uppercase tracking-wider opacity-70'>{label}</p>
                <p className='mt-1 text-3xl font-semibold leading-none'>{value}</p>
            </div>
            <Icon className='h-7 w-7 opacity-50 group-hover:opacity-80' />
        </Link>
    )
}

function Widget({ title, icon: Icon, href, action, children }) {
    return (
        <section className='rounded-xl border border-brand_soft/40 bg-white/70 p-4 sm:p-5'>
            <div className='mb-3 flex items-center justify-between'>
                <h2 className='flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-night_green/70'>
                    <Icon className='h-4 w-4 text-brand_main' />
                    {title}
                </h2>
                {href && (
                    <Link
                        href={href}
                        className='inline-flex items-center gap-1 text-xs font-medium text-brand_main hover:underline'
                    >
                        {action || "Открыть"}
                        <LuArrowRight className='h-3 w-3' />
                    </Link>
                )}
            </div>
            {children}
        </section>
    )
}

function EmptyState({ icon: Icon, title, hint }) {
    return (
        <div className='flex flex-col items-center justify-center rounded-lg border border-dashed border-brand_soft/50 px-4 py-6 text-center'>
            <Icon className='mb-2 h-6 w-6 text-brand_main/60' />
            <p className='text-sm font-medium text-night_green'>{title}</p>
            {hint && <p className='mt-1 text-xs text-night_green/55'>{hint}</p>}
        </div>
    )
}

function TaskGroup({ title, tone, tasks }) {
    const toneClass =
        tone === "danger"
            ? "border-red-200 bg-red-50/40"
            : tone === "warn"
              ? "border-amber-200 bg-amber-50/40"
              : "border-brand_soft/40 bg-white/60"
    const titleClass =
        tone === "danger"
            ? "text-red-700"
            : tone === "warn"
              ? "text-amber-800"
              : "text-night_green/70"
    return (
        <div className={`rounded-lg border ${toneClass} p-3`}>
            <p className={`mb-2 text-xs font-semibold uppercase ${titleClass}`}>{title}</p>
            <ul className='space-y-1.5'>
                {tasks.map(t => (
                    <li key={t.id}>
                        <Link
                            href='/crm/tasks'
                            className='flex items-start justify-between gap-3 rounded-md bg-white/70 p-2 text-sm hover:bg-white'
                        >
                            <div className='min-w-0 flex-1'>
                                <p className='truncate font-medium text-night_green'>
                                    {t.title}
                                </p>
                                <p className='truncate text-[11px] text-night_green/55'>
                                    {relationLabel(t)}
                                </p>
                            </div>
                            <div className='shrink-0 text-right text-[11px] text-night_green/65'>
                                <span className='inline-flex items-center gap-1'>
                                    <LuClock className='h-3 w-3' />
                                    {fmtDateTime(t.endAt)}
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
    if (t.distributor) return `Дистрибьютор: ${t.distributor.name}`
    if (t.endCustomer) return `Клиент: ${t.endCustomer.name}`
    return "Без связи"
}
