import { requireCrmSession } from "@/lib/crm/session"
import {
    DEFAULT_PROPOSAL_EMAIL_BODY,
    DEFAULT_PROPOSAL_EMAIL_SUBJECT,
    SETTING_KEYS,
    getProposalEmailTemplate,
    setSetting,
} from "@/lib/crm/settings"

// Шаблон письма для отправки КП. Читать могут все менеджеры
// (нужно для предзаполнения диалога), менять — только администратор.

export async function GET() {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    const template = await getProposalEmailTemplate()
    return Response.json({
        ...template,
        defaults: {
            subject: DEFAULT_PROPOSAL_EMAIL_SUBJECT,
            body: DEFAULT_PROPOSAL_EMAIL_BODY,
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
    await setSetting(SETTING_KEYS.proposalEmailSubject, subject)
    await setSetting(SETTING_KEYS.proposalEmailBody, template)

    const saved = await getProposalEmailTemplate()
    return Response.json(saved)
}
