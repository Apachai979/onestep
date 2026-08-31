import prisma from "@/lib/client"
import { requireCrmSession } from "@/lib/crm/session"
import { ENTITY_LABELS } from "@/lib/crm/change-log"
import { resolveChangeRelations } from "@/lib/crm/change-log-data"

export async function GET(request) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    const { searchParams } = new URL(request.url)
    const entityType = searchParams.get("entityType")
    const entityId = searchParams.get("entityId")
    const includeChildren = searchParams.get("includeChildren") === "1"
    const limit = Math.min(Number(searchParams.get("limit") || 100), 500)

    if (!entityType || !entityId) {
        return Response.json({ error: "entityType и entityId обязательны" }, { status: 400 })
    }
    if (!ENTITY_LABELS[entityType]) {
        return Response.json({ error: "Неизвестный тип сущности" }, { status: 400 })
    }

    const where = includeChildren
        ? {
              OR: [
                  { entityType, entityId },
                  { parentEntityType: entityType, parentEntityId: entityId },
              ],
          }
        : { entityType, entityId }

    const items = await prisma.changeLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        include: {
            author: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
    })

    const mapped = items.map(it => ({
        id: it.id,
        entityType: it.entityType,
        entityId: it.entityId,
        parentEntityType: it.parentEntityType,
        parentEntityId: it.parentEntityId,
        action: it.action,
        changes: it.changes ? JSON.parse(it.changes) : null,
        author: it.author,
        createdAt: it.createdAt,
    }))

    // Развернуть id в имена — общая для всех лент журнала работа, живёт в
    // change-log-data.js (её же использует отчёт по активности).
    return Response.json({ items: await resolveChangeRelations(mapped) })
}
