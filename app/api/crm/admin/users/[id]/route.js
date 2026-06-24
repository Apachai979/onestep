import prisma from "@/lib/client"
import { requireAdmin } from "@/lib/crm/admin"
import { parseUserUpdatePayload } from "@/lib/crm/invite"

export async function GET(_request, { params }) {
    const { session, response } = await requireAdmin()
    if (!session) return response

    const item = await prisma.user.findUnique({
        where: { id: params.id },
        select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            position: true,
            role: true,
            status: true,
            createdAt: true,
            updatedAt: true,
        },
    })
    if (!item) return Response.json({ error: "Не найдено" }, { status: 404 })
    return Response.json({ item })
}

export async function PATCH(request, { params }) {
    const { session, response } = await requireAdmin()
    if (!session) return response

    const existing = await prisma.user.findUnique({ where: { id: params.id } })
    if (!existing) return Response.json({ error: "Не найдено" }, { status: 404 })

    let body
    try {
        body = await request.json()
    } catch {
        return Response.json({ error: "Некорректный JSON" }, { status: 400 })
    }

    const { data, error } = parseUserUpdatePayload(body)
    if (error) return Response.json({ error }, { status: 400 })

    const isSelf = session.user.id === params.id
    if (isSelf) {
        if (data.role && data.role !== existing.role) {
            return Response.json(
                { error: "Нельзя изменить собственную роль" },
                { status: 400 },
            )
        }
        if (data.status && data.status !== existing.status) {
            return Response.json(
                { error: "Нельзя изменить собственный статус" },
                { status: 400 },
            )
        }
    }

    if (existing.role === "ADMIN" && (data.role === "MANAGER" || data.status === "BLOCKED")) {
        const activeAdmins = await prisma.user.count({
            where: { role: "ADMIN", status: "ACTIVE", NOT: { id: params.id } },
        })
        if (activeAdmins === 0) {
            return Response.json(
                { error: "Нельзя оставить систему без активного администратора" },
                { status: 400 },
            )
        }
    }

    const updated = await prisma.user.update({
        where: { id: params.id },
        data,
        select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            position: true,
            role: true,
            status: true,
        },
    })
    return Response.json({ item: updated })
}
