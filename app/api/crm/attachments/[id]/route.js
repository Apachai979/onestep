import prisma from "@/lib/client"
import { requireCrmSession } from "@/lib/crm/session"
import { deleteFile } from "@/lib/crm/storage/local"

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
    return Response.json({ ok: true })
}
