import prisma from "@/lib/client"
import { fillTemplate } from "./template"

export { fillTemplate }

// Ключи настроек — шаблоны писем: КП клиенту и уведомление о задаче.
export const SETTING_KEYS = {
    proposalEmailSubject: "proposalEmailSubject",
    proposalEmailBody: "proposalEmailBody",
    taskEmailSubject: "taskEmailSubject",
    taskEmailBody: "taskEmailBody",
}

export const DEFAULT_PROPOSAL_EMAIL_SUBJECT =
    "Коммерческое предложение № {{number}} от {{date}} — OneStep"

export const DEFAULT_PROPOSAL_EMAIL_BODY = `Здравствуйте, {{contact_name}}!

Направляем коммерческое предложение № {{number}} от {{date}} — документ во вложении.

Будем рады ответить на вопросы и обсудить условия поставки.

С уважением,
{{manager_name}}
Тел.: {{manager_phone}}
Email: {{manager_email}}
ООО «OneStep» · www.onestep.su`

// Плейсхолдеры, доступные в шаблоне (для подсказки в настройках).
export const PROPOSAL_EMAIL_PLACEHOLDERS = [
    ["{{number}}", "номер КП"],
    ["{{date}}", "дата КП"],
    ["{{buyer}}", "название клиента"],
    ["{{contact_name}}", "имя контактного лица"],
    ["{{manager_name}}", "имя менеджера"],
    ["{{manager_phone}}", "телефон менеджера"],
    ["{{manager_email}}", "email менеджера"],
]

// --- Письмо исполнителю о задаче ---------------------------------------
// Пол автора задачи неизвестен, поэтому формулировки безличные: «Вам
// поставлена задача», автор идёт отдельной строкой.
//
// Отдельной строки с адресом в шаблоне нет: ссылку несёт само название
// карточки в {{relation}} (а у задачи без привязки — {{title}}), см.
// buildTaskEmail в lib/crm/notify-task.js.

export const DEFAULT_TASK_EMAIL_SUBJECT = "Новая задача в CRM: {{title}}"

export const DEFAULT_TASK_EMAIL_BODY = `Здравствуйте, {{assignee_name}}!

{{action}}.

Задача: {{title}}
Тип: {{type}}
Срок: {{due}}
Автор: {{author_name}}
{{relation}}
{{description}}

Письмо отправлено автоматически. Отключить уведомления можно в профиле CRM.`

export const TASK_EMAIL_PLACEHOLDERS = [
    ["{{title}}", "заголовок задачи; ссылка, если привязки нет"],
    ["{{type}}", "тип задачи"],
    ["{{due}}", "срок"],
    ["{{action}}", "«Вам поставлена задача» / «Вам передана задача»"],
    ["{{author_name}}", "кто поставил задачу"],
    ["{{assignee_name}}", "имя исполнителя"],
    ["{{relation}}", "сделка, проект или контрагент — названием-ссылкой"],
    ["{{description}}", "описание задачи"],
    ["{{link}}", "адрес карточки отдельной строкой (в шаблоне не нужен)"],
    ["{{tasks_link}}", "адрес списка задач в CRM"],
]

export async function getSettings(keys) {
    const rows = await prisma.setting.findMany({ where: { key: { in: keys } } })
    return Object.fromEntries(rows.map(r => [r.key, r.value]))
}

export async function getProposalEmailTemplate() {
    const map = await getSettings([
        SETTING_KEYS.proposalEmailSubject,
        SETTING_KEYS.proposalEmailBody,
    ])
    return {
        subject: map[SETTING_KEYS.proposalEmailSubject] || DEFAULT_PROPOSAL_EMAIL_SUBJECT,
        body: map[SETTING_KEYS.proposalEmailBody] || DEFAULT_PROPOSAL_EMAIL_BODY,
    }
}

export async function getTaskEmailTemplate() {
    const map = await getSettings([
        SETTING_KEYS.taskEmailSubject,
        SETTING_KEYS.taskEmailBody,
    ])
    return {
        subject: map[SETTING_KEYS.taskEmailSubject] || DEFAULT_TASK_EMAIL_SUBJECT,
        body: map[SETTING_KEYS.taskEmailBody] || DEFAULT_TASK_EMAIL_BODY,
    }
}

export async function setSetting(key, value) {
    if (value === null || value === undefined || value === "") {
        // Пустое значение = вернуться к значению по умолчанию.
        await prisma.setting.deleteMany({ where: { key } })
        return
    }
    await prisma.setting.upsert({
        where: { key },
        create: { key, value },
        update: { value },
    })
}
