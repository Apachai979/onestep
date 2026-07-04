import prisma from "@/lib/client"
import { fillTemplate } from "./template"

export { fillTemplate }

// Ключи настроек — шаблон письма с КП.
export const SETTING_KEYS = {
    proposalEmailSubject: "proposalEmailSubject",
    proposalEmailBody: "proposalEmailBody",
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
