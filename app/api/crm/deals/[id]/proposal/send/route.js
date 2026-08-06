import prisma from "@/lib/client"
import { requireCrmSession } from "@/lib/crm/session"
import { buildProposalDoc } from "@/lib/crm/proposal-doc"
import { renderProposalPdf } from "@/lib/crm/proposal-pdf"
import { isMailConfigured, sendMail } from "@/lib/crm/mailer"
import { readFile, saveFile } from "@/lib/crm/storage/local"
import { logChange } from "@/lib/crm/change-log"
import { dealLockResponse } from "@/lib/crm/access"
import {
    MAX_MAIL_ATTACHMENTS_SIZE,
    formatBytes,
    validateUpload,
} from "@/lib/crm/attachment"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request, { params }) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    const deal = await prisma.deal.findUnique({
        where: { id: params.id },
        select: { status: true },
    })
    if (!deal) return Response.json({ error: "Сделка не найдена" }, { status: 404 })

    const locked = dealLockResponse(deal.status, session)
    if (locked) return locked

    if (!isMailConfigured()) {
        return Response.json(
            {
                error: "Отправка почты не настроена. Задайте SMTP_HOST, SMTP_USER, SMTP_PASS (и при необходимости SMTP_PORT, SMTP_FROM) в переменных окружения сервера.",
            },
            { status: 503 },
        )
    }

    // Письмо приходит либо чистым JSON, либо multipart — когда менеджер
    // приложил файлы со своего компьютера прямо в модалке отправки.
    let body
    let uploadedFiles = []
    if ((request.headers.get("content-type") || "").includes("multipart/form-data")) {
        let fd
        try {
            fd = await request.formData()
        } catch {
            return Response.json({ error: "Некорректная форма" }, { status: 400 })
        }
        try {
            body = JSON.parse(fd.get("payload") || "{}")
        } catch {
            return Response.json({ error: "Некорректный JSON в payload" }, { status: 400 })
        }
        uploadedFiles = fd.getAll("file").filter(f => f && typeof f !== "string")
    } else {
        try {
            body = await request.json()
        } catch {
            return Response.json({ error: "Некорректный JSON" }, { status: 400 })
        }
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

    // Само КП идёт первым вложением, дальше — то, что менеджер добавил вручную:
    // документы сделки и файлы, выбранные с компьютера.
    const attachments = [
        {
            filename: built.fileName,
            content: buffer,
            contentType: "application/pdf",
        },
    ]
    let totalSize = buffer.length

    const attachmentIds = Array.isArray(body.attachmentIds)
        ? body.attachmentIds.map(String).filter(Boolean).slice(0, 20)
        : []
    if (attachmentIds.length) {
        const docs = await prisma.attachment.findMany({
            where: { id: { in: attachmentIds }, entityType: "Deal", entityId: params.id },
            select: { id: true, fileName: true, mimeType: true, size: true, storageKey: true },
        })
        if (docs.length !== new Set(attachmentIds).size) {
            return Response.json(
                { error: "Часть выбранных документов не найдена в сделке" },
                { status: 400 },
            )
        }
        for (const doc of docs) {
            let content
            try {
                content = await readFile(doc.storageKey)
            } catch (err) {
                console.error("[proposal/send] attachment read error:", err)
                return Response.json(
                    { error: `Файл «${doc.fileName}» не читается на сервере` },
                    { status: 500 },
                )
            }
            totalSize += content.length
            attachments.push({
                filename: doc.fileName,
                content,
                contentType: doc.mimeType || "application/octet-stream",
            })
        }
    }

    for (const file of uploadedFiles) {
        const mimeType = file.type || "application/octet-stream"
        const validationErr = validateUpload({ size: file.size, mimeType })
        if (validationErr) {
            return Response.json({ error: `${file.name}: ${validationErr}` }, { status: 400 })
        }
        const content = Buffer.from(await file.arrayBuffer())
        totalSize += content.length
        attachments.push({
            filename: file.name || "file",
            content,
            contentType: mimeType,
        })
    }

    if (totalSize > MAX_MAIL_ATTACHMENTS_SIZE) {
        return Response.json(
            {
                error: `Суммарный размер вложений — ${formatBytes(totalSize)}, максимум ${formatBytes(MAX_MAIL_ATTACHMENTS_SIZE)}. Уберите лишние файлы или отправьте их ссылкой.`,
            },
            { status: 413 },
        )
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
            attachments,
        })
    } catch (err) {
        console.error("[proposal/send] smtp error:", err)
        return Response.json(
            { error: `Не удалось отправить письмо: ${err.message}` },
            { status: 502 },
        )
    }

    // След в сделке: событие в истории + заметка + (опционально) копия PDF.
    const attachmentNames = attachments.map(a => a.filename)
    const noteBody =
        `КП № ${built.number} от ${built.dateText} отправлено на ${to}\nТема: ${subject}` +
        (attachmentNames.length > 1 ? `\nВложения: ${attachmentNames.join(", ")}` : "")
    try {
        await logChange(prisma, {
            entityType: "Email",
            entityId: params.id,
            parentEntityType: "Deal",
            parentEntityId: params.id,
            action: "CREATE",
            payload: { number: built.number, to, subject, attachments: attachmentNames },
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
