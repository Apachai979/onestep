import { requireCrmSession } from "@/lib/crm/session"
import {
    DEFAULT_TASK_EMAIL_BODY,
    DEFAULT_TASK_EMAIL_SUBJECT,
    SETTING_KEYS,
    getTaskEmailTemplate,
    setSetting,
} from "@/lib/crm/settings"

// Шаблон автоматического письма исполнителю о поставленной задаче.
// Читать могут все менеджеры, менять — только администратор.

export async function GET() {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    const template = await getTaskEmailTemplate()
    return Response.json({
        ...template,
        defaults: {
            subject: DEFAULT_TASK_EMAIL_SUBJECT,
            body: DEFAULT_TASK_EMAIL_BODY,
        },
    })
}

export async function PUT(request) {
    const { session, response } = await requireCrmSession()
    if (!session) return response
    if (session.user.role !== "ADMIN") {
        return Response.json({ error: "Только для администратора" }, { status: 403 })
    }

    let body
    try {
        body = await request.json()
    } catch {
        return Response.json({ error: "Некорректный JSON" }, { status: 400 })
    }

    const subject = typeof body.subject === "string" ? body.subject.trim().slice(0, 300) : ""
    const template = typeof body.body === "string" ? body.body.trim().slice(0, 10_000) : ""

    // Пустое значение = вернуться к шаблону по умолчанию.
    await setSetting(SETTING_KEYS.taskEmailSubject, subject)
    await setSetting(SETTING_KEYS.taskEmailBody, template)

    const saved = await getTaskEmailTemplate()
    return Response.json(saved)
}
