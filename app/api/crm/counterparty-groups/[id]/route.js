import prisma from "@/lib/client"
import { requireCrmSession } from "@/lib/crm/session"
import { parseGroupPayload } from "@/lib/crm/counterparty-group"
import { attachClosedRevenue } from "@/lib/crm/revenue"
import { logChange } from "@/lib/crm/change-log"

const MEMBER_SELECT = {
    id: true,
    name: true,
    type: true,
    inn: true,
    kpp: true,
    region: true,
    totalRevenue: true,
    isGroupPrimary: true,
}

export async function GET(_request, { params }) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    const item = await prisma.counterpartyGroup.findUnique({
        where: { id: params.id },
        include: { members: { select: MEMBER_SELECT, orderBy: { name: "asc" } } },
    })
    if (!item) return Response.json({ error: "Не найдено" }, { status: 404 })
    await attachClosedRevenue(prisma, item)
    return Response.json({ item })
}

export async function PATCH(request, { params }) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    const existing = await prisma.counterpartyGroup.findUnique({ where: { id: params.id } })
    if (!existing) return Response.json({ error: "Не найдено" }, { status: 404 })

    let body
    try {
        body = await request.json()
    } catch {
        return Response.json({ error: "Некорректный JSON" }, { status: 400 })
    }

    const { data, error } = parseGroupPayload(body, { partial: true })
    if (error) return Response.json({ error }, { status: 400 })

    try {
        const updated = await prisma.counterpartyGroup.update({
            where: { id: params.id },
            data,
            include: { members: { select: MEMBER_SELECT, orderBy: { name: "asc" } } },
        })
        await attachClosedRevenue(prisma, updated)
        return Response.json({ item: updated })
    } catch (err) {
        console.error("[counterparty-groups.PATCH] error:", err)
        return Response.json({ error: `Ошибка сохранения: ${err.message}` }, { status: 500 })
    }
}

// Удаление группы не трогает сами юрлица — они просто перестают быть связанными.
export async function DELETE(_request, { params }) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    const existing = await prisma.counterpartyGroup.findUnique({
        where: { id: params.id },
        include: { members: { select: { id: true } } },
    })
    if (!existing) return Response.json({ error: "Не найдено" }, { status: 404 })

    try {
        await prisma.$transaction(async tx => {
            for (const m of existing.members) {
                await tx.counterparty.update({
                    where: { id: m.id },
                    data: {
                        groupId: null,
                        isGroupPrimary: false,
                        updatedById: session.user.id ?? null,
                    },
                })
                await logChange(tx, {
                    entityType: "Counterparty",
                    entityId: m.id,
                    action: "UPDATE",
                    payload: { groupId: { from: params.id, to: null } },
                    authorId: session.user.id,
                })
            }
            await tx.counterpartyGroup.delete({ where: { id: params.id } })
        })
        return Response.json({ ok: true })
    } catch (err) {
        console.error("[counterparty-groups.DELETE] error:", err)
        return Response.json({ error: `Ошибка удаления: ${err.message}` }, { status: 500 })
    }
}
