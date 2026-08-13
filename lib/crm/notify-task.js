import prisma from "@/lib/client"
import {
    MAIL_MUTED,
    escapeHtml,
    htmlDocument,
    isMailConfigured,
    mailLink,
    sendMail,
} from "./mailer"
import { fillTemplate, getTaskEmailTemplate } from "./settings"
import { wantsTaskEmail } from "./prefs"
import { displayName } from "./profile"
import { dealDisplayTitle } from "./deal"
import { TASK_RELATION_LABELS, TASK_TYPE_MAP, taskRangeLabel } from "./task"

// Письмо исполнителю о поставленной ему задаче.
//
// Отправка намеренно не блокирует API задач: сделать задачу важнее, чем
// доставить письмо, и лежащий SMTP не должен ронять создание. Поэтому функция
// ничего не бросает — все ошибки уходят в лог PM2, повторов нет.

const ACTION_TEXT = {
    created: "Вам поставлена задача в CRM OneStep",
    reassigned: "Вам передана задача в CRM OneStep",
}

function crmUrl(path) {
    const raw = process.env.CRM_BASE_URL || process.env.NEXTAUTH_URL || ""
    const base = raw.trim().replace(/\/+$/, "")
    return base ? `${base}${path}` : path
}

/**
 * Куда ведёт письмо. Отдельной страницы задачи нет, зато на карточке сделки,
 * проекта и контрагента задача видна в панели активности — поэтому у
 * привязанной задачи ссылка идёт на карточку, и менеджер сразу видит контекст.
 * Задача без привязки открывается из общего списка.
 */
function taskPath(task) {
    if (task.dealId) return `/crm/deals/${task.dealId}`
    if (task.projectId) return `/crm/projects/${task.projectId}`
    if (task.distributorId) return `/crm/counterparties/${task.distributorId}`
    if (task.endCustomerId) return `/crm/counterparties/${task.endCustomerId}`
    return "/crm/tasks"
}

// Привязка задачи: «Сделка» + название карточки.
// Задача может быть привязана только к одной сущности (см. parseTaskPayload).
function relationParts(task) {
    if (task.deal) {
        return {
            label: TASK_RELATION_LABELS.deal,
            name: dealDisplayTitle(task.deal, task.deal.counterparty?.name),
        }
    }
    if (task.project) {
        return { label: TASK_RELATION_LABELS.project, name: task.project.internalName }
    }
    if (task.distributor) {
        return { label: TASK_RELATION_LABELS.distributor, name: task.distributor.name }
    }
    if (task.endCustomer) {
        return { label: TASK_RELATION_LABELS.endCustomer, name: task.endCustomer.name }
    }
    return null
}

// Пустые подстановки (нет привязки, нет описания) оставляют в тексте дыры из
// пустых строк — схлопываем их до одной.
function tidy(text) {
    return text
        .replace(/[ \t]+$/gm, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim()
}

// «Срок: 14.08.2026» → подпись приглушённым, значение обычным цветом. Метка —
// это короткое начало строки до двоеточия, поэтому обычный текст письма и
// названия с двоеточием внутри («По проекту: ...») под правило не попадают.
function mutedLabel(line) {
    return line.replace(
        /^([^:<>]{2,24}):(\s)/,
        `<span style="color:${MAIL_MUTED};">$1:</span>$2`,
    )
}

/**
 * Вёрстка письма о задаче: тот же текст шаблона, чуть-чуть оформленный —
 * подписи полей приглушены, последний абзац отбит линией как сноска.
 * Разметка простая и инлайновая: письмо должно одинаково открываться в
 * Outlook, mail.ru и мобильных клиентах.
 */
function renderTaskHtml(escapedBody) {
    const blocks = escapedBody.split(/\n{2,}/)
    const inner = blocks
        .map((block, i) => {
            const lines = block.split("\n").map(mutedLabel).join("<br/>")
            const isFootnote = i === blocks.length - 1 && blocks.length > 1
            const style = isFootnote
                ? `margin:20px 0 0 0;padding-top:12px;border-top:1px solid #e5e7eb;font-size:12px;color:${MAIL_MUTED};`
                : "margin:0 0 14px 0;"
            return `<p style="${style}">${lines}</p>`
        })
        .join("")
    return htmlDocument(inner)
}

/**
 * Письмо в двух версиях. Основная — HTML: в ней ссылкой становится само
 * название карточки («Сделка: По проекту: АО ...»), отдельной строки с голым
 * адресом в письме нет. В plain-версии спрятать ссылку в текст нельзя, поэтому
 * адрес приписывается к той же строке — иначе из текстового клиента в CRM не
 * перейти. У задачи без привязки ссылку получает заголовок задачи.
 */
export function buildTaskEmail({ task, event = "created", assigneeName, template }) {
    const url = crmUrl(taskPath(task))
    const tasksUrl = crmUrl("/crm/tasks")
    const relation = relationParts(task)
    const description = task.description ? `Описание: ${task.description}` : ""

    const common = {
        type: TASK_TYPE_MAP[task.type]?.label || task.type,
        due: taskRangeLabel(task),
        action: ACTION_TEXT[event] || ACTION_TEXT.created,
        author_name: task.createdBy ? displayName(task.createdBy) : "",
        assignee_name: assigneeName,
    }

    // Тема письма — всегда без адресов, ссылке там делать нечего.
    const plainVars = {
        ...common,
        title: task.title,
        relation: relation ? `${relation.label}: ${relation.name}` : "",
        description,
        link: url,
        tasks_link: tasksUrl,
    }

    const textVars = {
        ...plainVars,
        title: relation ? task.title : `${task.title} — ${url}`,
        relation: relation ? `${relation.label}: ${relation.name} — ${url}` : "",
    }

    const htmlVars = {}
    for (const [k, v] of Object.entries(plainVars)) htmlVars[k] = escapeHtml(v)
    // Заголовок — главное в письме, поэтому он крупнее и жирнее остальных полей.
    htmlVars.title = `<strong style="font-size:16px;">${
        relation ? escapeHtml(task.title) : mailLink(url, task.title)
    }</strong>`
    htmlVars.relation = relation
        ? `${escapeHtml(relation.label)}: ${mailLink(url, relation.name)}`
        : ""
    // Если админ всё-таки вставит адрес в шаблон — пусть будет кликабельным.
    htmlVars.link = mailLink(url, url)
    htmlVars.tasks_link = mailLink(tasksUrl, tasksUrl)

    return {
        subject: tidy(fillTemplate(template.subject, plainVars)),
        text: tidy(fillTemplate(template.body, textVars)),
        // Шаблон экранируем до подстановки: значения уже несут готовую разметку.
        html: renderTaskHtml(tidy(fillTemplate(escapeHtml(template.body), htmlVars))),
    }
}

/**
 * @param {object} task    задача со связями (INCLUDE из роутов задач)
 * @param {string} actorId кто выполнил действие — себе письмо не шлём
 * @param {"created"|"reassigned"} event
 */
export async function notifyTaskAssigned({ task, actorId, event = "created" }) {
    try {
        if (!task?.assigneeId) return
        // Задачу себе менеджер поставил сам — он про неё и так знает.
        if (task.assigneeId === actorId) return
        if (!isMailConfigured()) {
            console.warn("[task-notify] SMTP не настроен, письмо не отправлено")
            return
        }

        const assignee = await prisma.user.findUnique({
            where: { id: task.assigneeId },
            select: {
                email: true,
                firstName: true,
                lastName: true,
                status: true,
                prefs: true,
            },
        })
        if (!assignee?.email || assignee.status !== "ACTIVE") return
        if (!wantsTaskEmail(assignee)) return

        const template = await getTaskEmailTemplate()
        const { subject, text, html } = buildTaskEmail({
            task,
            event,
            assigneeName: displayName(assignee),
            template,
        })

        await sendMail({ to: assignee.email, subject, text, html })
    } catch (err) {
        console.error("[task-notify] не удалось отправить письмо:", err)
    }
}
