import prisma from "@/lib/client"
import { requireCrmSession } from "@/lib/crm/session"
import { deleteFile } from "@/lib/crm/storage/local"
import { logChange } from "@/lib/crm/change-log"

function canDelete(session, att) {
    return att.uploadedById === session.user.id || session.user.role === "ADMIN"
}

export async function DELETE(_request, { params }) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    const existing = await prisma.attachment.findUnique({ where: { id: params.id } })
    if (!existing) return Response.json({ error: "Не найдено" }, { status: 404 })
    if (!canDelete(session, existing)) {
        return Response.json({ error: "Нет прав на удаление" }, { status: 403 })
    }

    await prisma.attachment.delete({ where: { id: params.id } })
    await deleteFile(existing.storageKey)

    if (existing.entityType && existing.entityId) {
        await logChange(prisma, {
            entityType: "Attachment",
            entityId: existing.id,
            parentEntityType: existing.entityType,
            parentEntityId: existing.entityId,
            action: "DELETE",
            payload: { fileName: existing.fileName },
            authorId: session.user.id,
        })
    }

    return Response.json({ ok: true })
}
