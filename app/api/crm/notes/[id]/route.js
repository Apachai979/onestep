import prisma from "@/lib/client"
import { requireCrmSession } from "@/lib/crm/session"
import { deleteFile } from "@/lib/crm/storage/local"

const USER_SELECT = { id: true, firstName: true, lastName: true, email: true }
const ATTACH_SELECT = {
    id: true,
    fileName: true,
    mimeType: true,
    size: true,
    createdAt: true,
    uploadedBy: { select: USER_SELECT },
}

function canMutate(session, note) {
    return note.authorId === session.user.id || session.user.role === "ADMIN"
}

export async function PATCH(request, { params }) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    const existing = await prisma.note.findUnique({ where: { id: params.id } })
    if (!existing) return Response.json({ error: "Не найдено" }, { status: 404 })

    let body
    try {
        body = await request.json()
    } catch {
        return Response.json({ error: "Некорректный JSON" }, { status: 400 })
    }

    const data = {}

    // pinned is editable by anyone with access
    if (body.pinned !== undefined) {
        data.pinned = !!body.pinned
    }

    // body is editable only by author/admin
    if (body.body !== undefined) {
        if (!canMutate(session, existing)) {
            return Response.json({ error: "Нет прав на изменение" }, { status: 403 })
        }
        if (typeof body.body !== "string" || !body.body.trim()) {
            return Response.json({ error: "Текст не может быть пустым" }, { status: 400 })
        }
        data.body = body.body.trim().slice(0, 10_000)
    }

    if (Object.keys(data).length === 0) {
        return Response.json({ error: "Нет полей для обновления" }, { status: 400 })
    }

    const updated = await prisma.note.update({
        where: { id: params.id },
        data,
        include: {
            author: { select: USER_SELECT },
            attachments: { select: ATTACH_SELECT },
        },
    })
    return Response.json({ item: updated })
}

export async function DELETE(_request, { params }) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    const existing = await prisma.note.findUnique({
        where: { id: params.id },
        include: { attachments: { select: { id: true, storageKey: true } } },
    })
    if (!existing) return Response.json({ error: "Не найдено" }, { status: 404 })
    if (!canMutate(session, existing)) {
        return Response.json({ error: "Нет прав на удаление" }, { status: 403 })
    }

    // Cascade delete + file cleanup
    await prisma.note.delete({ where: { id: params.id } })
    for (const att of existing.attachments) {
        await deleteFile(att.storageKey)
    }

    return Response.json({ ok: true })
}
