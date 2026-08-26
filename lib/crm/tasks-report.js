// Отчёт «Задачи менеджеров».
//
// Отвечает на два разных вопроса, и оба нужны, поэтому у отчёта две оси
// времени — путать их нельзя:
//
//   1. «Сколько менеджер сделал за период» — задачи, ЗАКРЫТЫЕ внутри периода
//      (Task.closedAt). Это работа, фактически выполненная в эти дни,
//      независимо от того, когда задача была поставлена.
//   2. «Что было запланировано на период и чем кончилось» — задачи, у которых
//      внутри периода СРОК (Task.endAt). Только здесь виден хвост: открытые и
//      просроченные. По оси закрытия их не видно вообще — они ещё не закрыты.
//
// Одна и та же задача обычно попадает в обе оси, но не всегда: поставленная в
// марте и закрытая в апреле сидит в плане марта и в сделанном за апрель.
//
// Задача принадлежит ИСПОЛНИТЕЛЮ (assigneeId) — это отчёт о работе менеджера,
// а не о том, кто раздаёт поручения. Постановщик считается отдельным разрезом:
// сколько задач сотрудник завёл другим и сколько себе.
//
// Даты сравниваются календарными днями в зоне CRM (Москва), а не моментами:
// период — это московские сутки, и «закрыто 31 марта в 23:40» должно попасть
// в март при любой зоне сервера.
import { crmYmd } from "./datetime"
import { dealDisplayTitle } from "./deal"
import { displayName } from "./profile"
import { TASK_RELATION_LABELS } from "./task"

// Историю задач в раскрытии строки режем: за год у активного менеджера их
// тысячи, и в JSON-ответ они лезут все. Полный список всегда есть в Excel —
// поэтому обрезку показываем подписью, а не молча.
export const TASKS_REPORT_HISTORY_LIMIT = 500

function userName(u) {
    if (!u) return "Без исполнителя"
    return displayName(u) || "Без исполнителя"
}

function inPeriod(day, from, to) {
    return Boolean(day) && day >= from && day <= to
}

function pct(part, whole, digits = 1) {
    if (!whole) return 0
    const k = 10 ** digits
    return Math.round((part / whole) * 100 * k) / k
}

function bump(map, key, init) {
    let row = map.get(key)
    if (!row) {
        row = init()
        map.set(key, row)
    }
    return row
}

// Привязка задачи — та же логика, что в письмах (notify-task.js): привязка
// всегда одна, и её название совпадает с заголовком карточки.
function taskRelation(task) {
    if (task.deal) {
        return {
            kind: "deal",
            label: TASK_RELATION_LABELS.deal,
            name: dealDisplayTitle(task.deal, task.deal.counterparty?.name),
            href: `/crm/deals/${task.deal.id}`,
        }
    }
    if (task.project) {
        return {
            kind: "project",
            label: TASK_RELATION_LABELS.project,
            name: task.project.internalName,
            href: `/crm/projects/${task.project.id}`,
        }
    }
    if (task.distributor) {
        return {
            kind: "distributor",
            label: TASK_RELATION_LABELS.distributor,
            name: task.distributor.name,
            href: `/crm/counterparties/${task.distributor.id}`,
        }
    }
    if (task.endCustomer) {
        return {
            kind: "endCustomer",
            label: TASK_RELATION_LABELS.endCustomer,
            name: task.endCustomer.name,
            href: `/crm/counterparties/${task.endCustomer.id}`,
        }
    }
    return null
}

function emptyClosed() {
    return { total: 0, done: 0, failed: 0, doneOnTime: 0, doneLate: 0 }
}

function emptyPlanned() {
    return { total: 0, done: 0, failed: 0, open: 0, overdue: 0 }
}

function emptyCreated() {
    return { total: 0, forOthers: 0, forSelf: 0 }
}

function emptyManager(user) {
    return {
        id: user?.id || null,
        name: userName(user),
        position: user?.position || null,
        closed: emptyClosed(),
        planned: emptyPlanned(),
        created: emptyCreated(),
        tasks: [],
    }
}

/**
 * Собирает отчёт из уже загруженных задач (чистая функция — выборка живёт в
 * tasks-report-data.js).
 *
 * tasks: Task[] с include { assignee, createdBy, deal { counterparty,
 *        sourceProject }, project, distributor, endCustomer } — те, что попали
 *        в период хотя бы по одной из дат closedAt / endAt / createdAt.
 * now:   момент расчёта «просрочено» — открытая задача с прошедшим сроком.
 * historyLimit: сколько задач оставить в расшифровке менеджера. Excel-выгрузка
 *        снимает ограничение (Infinity) — файл открывают именно ради полного
 *        списка, а лимит здесь стоит только против тяжёлого JSON.
 */
export function buildTasksReport({
    tasks = [],
    from = null,
    to = null,
    now = new Date(),
    historyLimit = TASKS_REPORT_HISTORY_LIMIT,
} = {}) {
    const managers = new Map()
    const creators = new Map()
    const types = new Map()
    const nowMs = new Date(now).getTime()

    const totals = {
        closed: emptyClosed(),
        planned: emptyPlanned(),
        created: emptyCreated(),
        // Закрытая задача без closedAt в ось «сделано» не попадает: разложить
        // её по дням нечем, а тихо приписать к периоду — исказить цифру.
        // Такие записи остались от закрытий до появления поля.
        undatedClosed: 0,
    }

    for (const task of tasks) {
        const assignee = task.assignee || null
        const assigneeId = assignee?.id || "—"
        const creator = task.createdBy || null
        const creatorId = creator?.id || "—"

        const isClosed = task.status !== "OPEN"
        const closedDay = isClosed ? crmYmd(task.closedAt) : null
        const dueDay = crmYmd(task.endAt)
        const createdDay = crmYmd(task.createdAt)

        const inClosed = isClosed && inPeriod(closedDay, from, to)
        const inDue = inPeriod(dueDay, from, to)
        const inCreated = inPeriod(createdDay, from, to)

        if (isClosed && !closedDay && (inDue || inCreated)) totals.undatedClosed += 1
        if (!inClosed && !inDue && !inCreated) continue

        // «В срок» — закрыта не позже своего срока. У задачи «на весь день»
        // endAt это конец московских суток, поэтому закрытие в тот же день
        // опозданием не считается.
        const late =
            isClosed && task.closedAt
                ? new Date(task.closedAt).getTime() > new Date(task.endAt).getTime()
                : false
        const overdue = !isClosed && new Date(task.endAt).getTime() < nowMs

        const m = bump(managers, assigneeId, () => emptyManager(assignee))

        if (inClosed) {
            m.closed.total += 1
            totals.closed.total += 1
            if (task.status === "DONE") {
                m.closed.done += 1
                totals.closed.done += 1
                if (late) {
                    m.closed.doneLate += 1
                    totals.closed.doneLate += 1
                } else {
                    m.closed.doneOnTime += 1
                    totals.closed.doneOnTime += 1
                }
            } else {
                m.closed.failed += 1
                totals.closed.failed += 1
            }

            // Разбивка по типам — по закрытым задачам: она отвечает на вопрос
            // «чем занимался отдел», а план на период этого не показывает.
            // Разрез сводный: на строку менеджера типы не раскладываем — в его
            // расшифровке нужна история задач, а не вторая таблица.
            const gt = bump(types, task.type, () => ({
                key: task.type,
                closed: 0,
                done: 0,
                failed: 0,
                managers: new Set(),
            }))
            gt.closed += 1
            if (task.status === "DONE") gt.done += 1
            else gt.failed += 1
            gt.managers.add(assigneeId)
        }

        if (inDue) {
            m.planned.total += 1
            totals.planned.total += 1
            if (task.status === "DONE") {
                m.planned.done += 1
                totals.planned.done += 1
            } else if (task.status === "FAILED") {
                m.planned.failed += 1
                totals.planned.failed += 1
            } else {
                m.planned.open += 1
                totals.planned.open += 1
                if (overdue) {
                    m.planned.overdue += 1
                    totals.planned.overdue += 1
                }
            }
        }

        if (inCreated) {
            const forSelf = Boolean(creator?.id && assignee?.id && creator.id === assignee.id)

            const c = bump(creators, creatorId, () => ({
                id: creator?.id || null,
                name: userName(creator),
                position: creator?.position || null,
                ...emptyCreated(),
                assignees: new Set(),
            }))
            c.total += 1
            totals.created.total += 1
            if (forSelf) {
                c.forSelf += 1
                totals.created.forSelf += 1
            } else {
                c.forOthers += 1
                totals.created.forOthers += 1
                if (assignee?.id) c.assignees.add(assignee.id)
            }

            // Та же цифра на строке сотрудника — сколько он за период поставил.
            // Постановщик мог за период не закрыть ни одной своей задачи, и
            // тогда строка появляется здесь: иначе его работа исчезла бы.
            const mc = bump(managers, creatorId, () => emptyManager(creator))
            mc.created.total += 1
            if (forSelf) mc.created.forSelf += 1
            else mc.created.forOthers += 1
        }

        m.tasks.push({
            id: task.id,
            title: task.title,
            description: task.description || null,
            type: task.type,
            status: task.status,
            allDay: task.allDay,
            startAt: task.startAt,
            endAt: task.endAt,
            closedAt: task.closedAt,
            result: task.result || null,
            late,
            overdue,
            inClosed,
            inDue,
            relation: taskRelation(task),
            createdByName: creator ? userName(creator) : null,
            // Задачу мог поставить руководитель или коллега — без этой подписи
            // непонятно, откуда она у менеджера взялась.
            createdByOther: Boolean(creator?.id && assignee?.id && creator.id !== assignee.id),
        })
    }

    const managerRows = Array.from(managers.values())
        .map(m => {
            const tasksSorted = m.tasks.sort(
                (a, b) => new Date(b.closedAt || b.endAt) - new Date(a.closedAt || a.endAt),
            )
            return {
                id: m.id,
                name: m.name,
                position: m.position,
                closed: m.closed,
                planned: m.planned,
                created: m.created,
                doneRate: pct(m.closed.done, m.closed.total),
                onTimeRate: pct(m.closed.doneOnTime, m.closed.done),
                tasksCount: tasksSorted.length,
                tasksTruncated: tasksSorted.length > historyLimit,
                tasks: Number.isFinite(historyLimit)
                    ? tasksSorted.slice(0, historyLimit)
                    : tasksSorted,
            }
        })
        .sort((a, b) => b.closed.done - a.closed.done || b.planned.total - a.planned.total)

    return {
        period: { from, to },
        managers: managerRows,
        creators: Array.from(creators.values())
            .map(({ assignees, ...c }) => ({ ...c, assigneesCount: assignees.size }))
            .sort((a, b) => b.total - a.total),
        types: Array.from(types.values())
            .map(({ managers: mset, ...t }) => ({ ...t, managersCount: mset.size }))
            .sort((a, b) => b.closed - a.closed),
        totals: {
            ...totals,
            // Считаем только тех, у кого в периоде была работа: строка «поставил
            // задачи другим и всё» менеджером с задачами не является.
            managersCount: managerRows.filter(m => m.closed.total > 0 || m.planned.total > 0)
                .length,
            doneRate: pct(totals.closed.done, totals.closed.total),
            onTimeRate: pct(totals.closed.doneOnTime, totals.closed.done),
        },
    }
}
