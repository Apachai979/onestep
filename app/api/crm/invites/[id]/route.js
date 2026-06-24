import prisma from "@/lib/client"
import { requireAdmin } from "@/lib/crm/admin"

export async function DELETE(_request, { params }) {
    const { session, response } = await requireAdmin()
    if (!session) return response

    const invite = await prisma.invite.findUnique({ where: { id: params.id } })
    if (!invite) return Response.json({ error: "Не найдено" }, { status: 404 })
    if (invite.usedAt) {
        return Response.json({ error: "Инвайт уже использован" }, { status: 400 })
    }

    await prisma.invite.delete({ where: { id: params.id } })
    return Response.json({ ok: true })
}
