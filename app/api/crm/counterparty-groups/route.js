import prisma from "@/lib/client"
import { requireCrmSession } from "@/lib/crm/session"
import { parseGroupPayload } from "@/lib/crm/counterparty-group"
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

export async function GET(request) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    const { searchParams } = new URL(request.url)
    const q = searchParams.get("q")?.trim().toLowerCase()

    const items = await prisma.counterpartyGroup.findMany({
        orderBy: { name: "asc" },
        include: { members: { select: MEMBER_SELECT, orderBy: { name: "asc" } } },
    })

    // Поиск по названию группы и по названию/ИНН любого её юрлица — менеджер
    // ищет по тем реквизитам, которые прислал клиент.
    const filtered = q
        ? items.filter(g => {
              if ((g.name || "").toLowerCase().includes(q)) return true
              return g.members.some(
                  m =>
                      (m.name || "").toLowerCase().includes(q) ||
                      (m.inn || "").toLowerCase().includes(q),
              )
          })
        : items

    return Response.json({ items: filtered })
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

    const { data, error } = parseGroupPayload(body)
    if (error) return Response.json({ error }, { status: 400 })

    const memberIds = Array.isArray(body.memberIds)
        ? body.memberIds.filter(id => typeof id === "string" && id)
        : []
    const primaryId =
        typeof body.primaryId === "string" && body.primaryId ? body.primaryId : memberIds[0]

    if (memberIds.length > 0) {
        const members = await prisma.counterparty.findMany({
            where: { id: { in: memberIds } },
            select: { id: true, name: true, groupId: true, group: { select: { name: true } } },
        })
        if (members.length !== memberIds.length) {
            return Response.json({ error: "Контрагент не найден" }, { status: 400 })
        }
        const busy = members.find(m => m.groupId)
        if (busy) {
            return Response.json(
                {
                    error: `«${busy.name}» уже состоит в группе «${busy.group?.name ?? ""}» — сначала отвяжите юрлицо`,
                },
                { status: 409 },
            )
        }
    }

    try {
        const created = await prisma.$transaction(async tx => {
            const group = await tx.counterpartyGroup.create({ data })

            for (const id of memberIds) {
                await tx.counterparty.update({
                    where: { id },
                    data: {
                        groupId: group.id,
                        isGroupPrimary: id === primaryId,
                        updatedById: session.user.id ?? null,
                    },
                })
                await logChange(tx, {
                    entityType: "Counterparty",
                    entityId: id,
                    action: "UPDATE",
                    payload: { groupId: { from: null, to: group.id } },
                    authorId: session.user.id,
                })
            }

            return tx.counterpartyGroup.findUnique({
                where: { id: group.id },
                include: { members: { select: MEMBER_SELECT, orderBy: { name: "asc" } } },
            })
        })
        return Response.json({ item: created }, { status: 201 })
    } catch (err) {
        console.error("[counterparty-groups.POST] error:", err)
        return Response.json({ error: `Ошибка сохранения: ${err.message}` }, { status: 500 })
    }
}
