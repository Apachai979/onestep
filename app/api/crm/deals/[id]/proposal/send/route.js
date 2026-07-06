import prisma from "@/lib/client"
import { requireCrmSession } from "@/lib/crm/session"
import { buildProposalDoc } from "@/lib/crm/proposal-doc"
import { renderProposalPdf } from "@/lib/crm/proposal-pdf"
import { isMailConfigured, sendMail } from "@/lib/crm/mailer"
import { saveFile } from "@/lib/crm/storage/local"
import { logChange } from "@/lib/crm/change-log"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request, { params }) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    if (!isMailConfigured()) {
        return Response.json(
            {
                error: "Отправка почты не настроена. Задайте SMTP_HOST, SMTP_USER, SMTP_PASS (и при необходимости SMTP_PORT, SMTP_FROM) в переменных окружения сервера.",
            },
            { status: 503 },
        )
    }

    let body
    try {
        body = await request.json()
    } catch {
        return Response.json({ error: "Некорректный JSON" }, { status: 400 })
    }

    const to = String(body.to || "").trim()
    const subject = String(body.subject || "").trim().slice(0, 300)
    const message = String(body.message || "").trim().slice(0, 10_000)
    const saveCopy = body.saveCopy !== false

    if (!EMAIL_RE.test(to)) {
        return Response.json({ error: "Укажите корректный email получателя" }, { status: 400 })
    }
    if (!subject) return Response.json({ error: "Укажите тему письма" }, { status: 400 })
    if (!message) return Response.json({ error: "Текст письма пуст" }, { status: 400 })

    const built = await buildProposalDoc(params.id, body.form || {})
    if (built.error) {
        return Response.json({ error: built.error }, { status: built.status || 400 })
    }

    let buffer
    try {
        buffer = await renderProposalPdf(built.docData)
    } catch (err) {
        console.error("[proposal/send] render error:", err)
        return Response.json({ error: `Ошибка PDF: ${err.message}` }, { status: 500 })
    }

    // Ответ клиента должен уходить менеджеру, а не на общий ящик.
    const replyTo =
        built.docData.senderEmail || session.user.email || undefined

    let sendResult
    try {
        sendResult = await sendMail({
            to,
            replyTo,
            subject,
            text: message,
            attachments: [
                {
                    filename: built.fileName,
                    content: buffer,
                    contentType: "application/pdf",
                },
            ],
        })
    } catch (err) {
        console.error("[proposal/send] smtp error:", err)
        return Response.json(
            { error: `Не удалось отправить письмо: ${err.message}` },
            { status: 502 },
        )
    }

    // След в сделке: событие в истории + заметка + (опционально) копия PDF.
    const noteBody = `КП № ${built.number} от ${built.dateText} отправлено на ${to}\nТема: ${subject}`
    try {
        await logChange(prisma, {
            entityType: "Email",
            entityId: params.id,
            parentEntityType: "Deal",
            parentEntityId: params.id,
            action: "CREATE",
            payload: { number: built.number, to, subject },
            authorId: session.user.id,
        })
        await prisma.note.create({
            data: {
                body: noteBody,
                entityType: "Deal",
                entityId: params.id,
                authorId: session.user.id,
            },
        })
        if (saveCopy) {
            const storageKey = await saveFile(buffer, {
                fileName: built.fileName,
                entityType: "Deal",
                entityId: params.id,
            })
            await prisma.attachment.create({
                data: {
                    fileName: built.fileName,
                    mimeType: "application/pdf",
                    size: buffer.length,
                    storageKey,
                    entityType: "Deal",
                    entityId: params.id,
                    uploadedById: session.user.id,
                },
            })
        }
    } catch (err) {
        // Письмо уже ушло — след не удался, но это не повод отдавать ошибку отправки.
        console.error("[proposal/send] trace error:", err)
    }

    return Response.json({
        ok: true,
        to,
        messageId: sendResult.messageId,
        previewUrl: sendResult.previewUrl,
    })
}
