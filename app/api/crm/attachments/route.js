import prisma from "@/lib/client"
import { requireCrmSession } from "@/lib/crm/session"
import {
    MAX_FILE_SIZE,
    validateAttachmentTarget,
    validateUpload,
} from "@/lib/crm/attachment"
import { saveFile } from "@/lib/crm/storage/local"
import { logChange } from "@/lib/crm/change-log"

const USER_SELECT = { id: true, firstName: true, lastName: true, email: true }
const ATTACH_PUBLIC = {
    id: true,
    fileName: true,
    mimeType: true,
    size: true,
    entityType: true,
    entityId: true,
    noteId: true,
    createdAt: true,
    uploadedBy: { select: USER_SELECT },
}

export async function GET(request) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    const { searchParams } = new URL(request.url)
    const entityType = searchParams.get("entityType")
    const entityId = searchParams.get("entityId")

    const err = validateAttachmentTarget({ entityType, entityId })
    if (err) return Response.json({ error: err }, { status: 400 })

    const items = await prisma.attachment.findMany({
        where: { entityType, entityId, noteId: null },
        orderBy: { createdAt: "desc" },
        select: ATTACH_PUBLIC,
    })
    return Response.json({ items })
}

export async function POST(request) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    let form
    try {
        form = await request.formData()
    } catch {
        return Response.json({ error: "Ожидается multipart/form-data" }, { status: 400 })
    }

    const entityType = form.get("entityType") || null
    const entityId = form.get("entityId") || null
    const noteId = form.get("noteId") || null
    const targetErr = validateAttachmentTarget({ entityType, entityId, noteId })
    if (targetErr) return Response.json({ error: targetErr }, { status: 400 })

    const files = form.getAll("file")
    if (!files.length) {
        return Response.json({ error: "Файлы не получены" }, { status: 400 })
    }

    const created = []
    for (const file of files) {
        if (!file || typeof file === "string") {
            return Response.json({ error: "Некорректный файл" }, { status: 400 })
        }
        const size = file.size
        const mimeType = file.type || "application/octet-stream"

        const validationErr = validateUpload({ size, mimeType })
        if (validationErr) {
            return Response.json({ error: validationErr }, { status: 400 })
        }
        if (size > MAX_FILE_SIZE) {
            return Response.json(
                { error: `Файл больше ${MAX_FILE_SIZE} байт` },
                { status: 413 },
            )
        }

        const buffer = Buffer.from(await file.arrayBuffer())
        const storageKey = await saveFile(buffer, {
            fileName: file.name,
            entityType: noteId ? null : entityType,
            entityId: noteId ? null : entityId,
            noteId,
        })

        const att = await prisma.attachment.create({
            data: {
                fileName: file.name || "file",
                mimeType,
                size,
                storageKey,
                entityType: noteId ? null : entityType,
                entityId: noteId ? null : entityId,
                noteId: noteId || null,
                uploadedById: session.user.id,
            },
            select: ATTACH_PUBLIC,
        })
        created.push(att)

        // Файлы, привязанные к карточке (не к заметке), — в историю карточки.
        if (!noteId && entityType && entityId) {
            await logChange(prisma, {
                entityType: "Attachment",
                entityId: att.id,
                parentEntityType: entityType,
                parentEntityId: entityId,
                action: "CREATE",
                payload: { fileName: att.fileName },
                authorId: session.user.id,
            })
        }
    }

    return Response.json({ items: created }, { status: 201 })
}
