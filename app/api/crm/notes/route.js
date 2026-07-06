import prisma from "@/lib/client"
import { requireCrmSession } from "@/lib/crm/session"
import { validateNoteTarget } from "@/lib/crm/attachment"
import { excerpt, logChange } from "@/lib/crm/change-log"

const USER_SELECT = { id: true, firstName: true, lastName: true, email: true }
const ATTACH_SELECT = {
    id: true,
    fileName: true,
    mimeType: true,
    size: true,
    createdAt: true,
    uploadedBy: { select: USER_SELECT },
}

export async function GET(request) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    const { searchParams } = new URL(request.url)
    const entityType = searchParams.get("entityType")
    const entityId = searchParams.get("entityId")

    const err = validateNoteTarget({ entityType, entityId })
    if (err) return Response.json({ error: err }, { status: 400 })

    const items = await prisma.note.findMany({
        where: { entityType, entityId },
        orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
        include: {
            author: { select: USER_SELECT },
            attachments: { select: ATTACH_SELECT },
        },
    })
    return Response.json({ items })
}

export async function POST(request) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    let body
    try {
        body = await request.json()
    } catch {
        return Response.json({ error: "Некорректный JSON" }, { status: 400 })
    }

    const { entityType, entityId, attachmentIds } = body || {}
    const targetErr = validateNoteTarget({ entityType, entityId })
    if (targetErr) return Response.json({ error: targetErr }, { status: 400 })

    if (typeof body.body !== "string" || !body.body.trim()) {
        return Response.json({ error: "Текст заметки обязателен" }, { status: 400 })
    }

    const note = await prisma.note.create({
        data: {
            body: body.body.trim().slice(0, 10_000),
            entityType,
            entityId,
            authorId: session.user.id,
        },
        include: {
            author: { select: USER_SELECT },
            attachments: { select: ATTACH_SELECT },
        },
    })

    await logChange(prisma, {
        entityType: "Note",
        entityId: note.id,
        parentEntityType: entityType,
        parentEntityId: entityId,
        action: "CREATE",
        payload: { body: excerpt(note.body) },
        authorId: session.user.id,
    })

    if (Array.isArray(attachmentIds) && attachmentIds.length) {
        await prisma.attachment.updateMany({
            where: {
                id: { in: attachmentIds.filter(s => typeof s === "string") },
                uploadedById: session.user.id,
                noteId: null,
            },
            data: { noteId: note.id, entityType: null, entityId: null },
        })
        const fresh = await prisma.note.findUnique({
            where: { id: note.id },
            include: {
                author: { select: USER_SELECT },
                attachments: { select: ATTACH_SELECT },
            },
        })
        return Response.json({ item: fresh }, { status: 201 })
    }

    return Response.json({ item: note }, { status: 201 })
}
