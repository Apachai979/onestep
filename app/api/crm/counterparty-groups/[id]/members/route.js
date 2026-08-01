import prisma from "@/lib/client"
import { requireCrmSession } from "@/lib/crm/session"
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

function groupWithMembers(tx, id) {
    return tx.counterpartyGroup.findUnique({
        where: { id },
        include: { members: { select: MEMBER_SELECT, orderBy: { name: "asc" } } },
    })
}

async function loadGroup(id) {
    const group = await prisma.counterpartyGroup.findUnique({
        where: { id },
        include: { members: { select: MEMBER_SELECT, orderBy: { name: "asc" } } },
    })
    return group
}

// Привязать существующего контрагента к группе.
export async function POST(request, { params }) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    const group = await loadGroup(params.id)
    if (!group) return Response.json({ error: "Группа не найдена" }, { status: 404 })

    let body
    try {
        body = await request.json()
    } catch {
        return Response.json({ error: "Некорректный JSON" }, { status: 400 })
    }

    const counterpartyId = body?.counterpartyId
    if (typeof counterpartyId !== "string" || !counterpartyId) {
        return Response.json({ error: "Укажите юрлицо" }, { status: 400 })
    }

    const cp = await prisma.counterparty.findUnique({
        where: { id: counterpartyId },
        select: { id: true, name: true, groupId: true, group: { select: { name: true } } },
    })
    if (!cp) return Response.json({ error: "Контрагент не найден" }, { status: 404 })
    if (cp.groupId === group.id) {
        await attachClosedRevenue(prisma, group)
        return Response.json({ item: group })
    }
    if (cp.groupId) {
        return Response.json(
            {
                error: `«${cp.name}» уже состоит в группе «${cp.group?.name ?? ""}» — сначала отвяжите юрлицо`,
            },
            { status: 409 },
        )
    }

    // Первое юрлицо группы становится головным автоматически.
    const makePrimary = body?.isGroupPrimary === true || group.members.length === 0

    try {
        const updated = await prisma.$transaction(async tx => {
            if (makePrimary) {
                await tx.counterparty.updateMany({
                    where: { groupId: group.id },
                    data: { isGroupPrimary: false },
                })
            }
            await tx.counterparty.update({
                where: { id: counterpartyId },
                data: {
                    groupId: group.id,
                    isGroupPrimary: makePrimary,
                    updatedById: session.user.id ?? null,
                },
            })
            await logChange(tx, {
                entityType: "Counterparty",
                entityId: counterpartyId,
                action: "UPDATE",
                payload: { groupId: { from: null, to: group.id } },
                authorId: session.user.id,
            })
            return groupWithMembers(tx, group.id)
        })
        await attachClosedRevenue(prisma, updated)
        return Response.json({ item: updated })
    } catch (err) {
        console.error("[counterparty-groups.members.POST] error:", err)
        return Response.json({ error: `Ошибка сохранения: ${err.message}` }, { status: 500 })
    }
}

// Назначить юрлицо головным в группе.
export async function PATCH(request, { params }) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    const group = await loadGroup(params.id)
    if (!group) return Response.json({ error: "Группа не найдена" }, { status: 404 })

    let body
    try {
        body = await request.json()
    } catch {
        return Response.json({ error: "Некорректный JSON" }, { status: 400 })
    }

    const counterpartyId = body?.counterpartyId
    if (typeof counterpartyId !== "string" || !counterpartyId) {
        return Response.json({ error: "Укажите юрлицо" }, { status: 400 })
    }
    if (!group.members.some(m => m.id === counterpartyId)) {
        return Response.json({ error: "Юрлицо не состоит в этой группе" }, { status: 400 })
    }

    try {
        const updated = await prisma.$transaction(async tx => {
            await tx.counterparty.updateMany({
                where: { groupId: group.id },
                data: { isGroupPrimary: false },
            })
            await tx.counterparty.update({
                where: { id: counterpartyId },
                data: { isGroupPrimary: true, updatedById: session.user.id ?? null },
            })
            await logChange(tx, {
                entityType: "Counterparty",
                entityId: counterpartyId,
                action: "UPDATE",
                payload: { isGroupPrimary: { from: false, to: true } },
                authorId: session.user.id,
            })
            return groupWithMembers(tx, group.id)
        })
        await attachClosedRevenue(prisma, updated)
        return Response.json({ item: updated })
    } catch (err) {
        console.error("[counterparty-groups.members.PATCH] error:", err)
        return Response.json({ error: `Ошибка сохранения: ${err.message}` }, { status: 500 })
    }
}

// Отвязать юрлицо от группы. Сделки, где оно указано плательщиком, не трогаем —
// это исторический факт: документы уже оформлены на него.
export async function DELETE(request, { params }) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    const group = await loadGroup(params.id)
    if (!group) return Response.json({ error: "Группа не найдена" }, { status: 404 })

    const { searchParams } = new URL(request.url)
    const counterpartyId = searchParams.get("counterpartyId")
    if (!counterpartyId) return Response.json({ error: "Укажите юрлицо" }, { status: 400 })

    const member = group.members.find(m => m.id === counterpartyId)
    if (!member) {
        return Response.json({ error: "Юрлицо не состоит в этой группе" }, { status: 400 })
    }

    const rest = group.members.filter(m => m.id !== counterpartyId)

    try {
        const updated = await prisma.$transaction(async tx => {
            await tx.counterparty.update({
                where: { id: counterpartyId },
                data: {
                    groupId: null,
                    isGroupPrimary: false,
                    updatedById: session.user.id ?? null,
                },
            })
            await logChange(tx, {
                entityType: "Counterparty",
                entityId: counterpartyId,
                action: "UPDATE",
                payload: { groupId: { from: group.id, to: null } },
                authorId: session.user.id,
            })

            // Группа без юрлиц не нужна; группа без головного — тоже не нужна,
            // назначаем следующего по алфавиту.
            if (rest.length === 0) {
                await tx.counterpartyGroup.delete({ where: { id: group.id } })
                return null
            }
            if (member.isGroupPrimary) {
                await tx.counterparty.update({
                    where: { id: rest[0].id },
                    data: { isGroupPrimary: true },
                })
            }
            return groupWithMembers(tx, group.id)
        })
        await attachClosedRevenue(prisma, updated)
        return Response.json({ item: updated })
    } catch (err) {
        console.error("[counterparty-groups.members.DELETE] error:", err)
        return Response.json({ error: `Ошибка удаления: ${err.message}` }, { status: 500 })
    }
}
