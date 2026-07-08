import prisma from "@/lib/client"
import { requireCrmSession } from "@/lib/crm/session"
import { ENTITY_LABELS, enumValueLabel } from "@/lib/crm/change-log"

const RELATION_FIELDS = {
    Counterparty: {
        managerId: { model: "user" },
    },
    Deal: {
        counterpartyId: { model: "counterparty" },
        contactId: { model: "contact" },
        managerId: { model: "user" },
        sourceProjectId: { model: "project" },
    },
    DealItem: {
        productId: { model: "product" },
    },
    Project: {
        distributorId: { model: "counterparty" },
        endCustomerId: { model: "counterparty" },
        managerId: { model: "user" },
    },
    ProjectItem: {
        productId: { model: "product" },
    },
    Task: {
        assigneeId: { model: "user" },
        dealId: { model: "deal" },
        projectId: { model: "project" },
        distributorId: { model: "counterparty" },
        endCustomerId: { model: "counterparty" },
    },
    Auction: {
        managerId: { model: "user" },
        supplierContactId: { model: "contact" },
    },
    AuctionItem: {
        productId: { model: "product" },
    },
}

function fullName(u) {
    if (!u) return null
    return `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email || null
}

function contactName(c) {
    if (!c) return null
    return (
        `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() || c.email || c.phone || null
    )
}

function dealTitle(d) {
    if (!d) return null
    return d.title || (d.counterparty?.name ? `Сделка с ${d.counterparty.name}` : null)
}

function projectTitle(p) {
    if (!p) return null
    return p.internalName || p.externalAuctionId || null
}

async function resolveRelations(items) {
    const ids = {
        counterparty: new Set(),
        contact: new Set(),
        user: new Set(),
        product: new Set(),
        deal: new Set(),
        project: new Set(),
    }

    for (const it of items) {
        const map = RELATION_FIELDS[it.entityType]
        if (!map || !it.changes) continue
        for (const [field, cfg] of Object.entries(map)) {
            const val = it.changes[field]
            if (val == null) continue
            if (typeof val === "object" && ("from" in val || "to" in val)) {
                if (val.from) ids[cfg.model].add(val.from)
                if (val.to) ids[cfg.model].add(val.to)
            } else if (typeof val === "string") {
                ids[cfg.model].add(val)
            }
        }
    }

    const [counterparties, contacts, users, products, deals, projects] = await Promise.all([
        ids.counterparty.size
            ? prisma.counterparty.findMany({
                  where: { id: { in: Array.from(ids.counterparty) } },
                  select: { id: true, name: true },
              })
            : [],
        ids.contact.size
            ? prisma.contact.findMany({
                  where: { id: { in: Array.from(ids.contact) } },
                  select: { id: true, firstName: true, lastName: true, email: true, phone: true },
              })
            : [],
        ids.user.size
            ? prisma.user.findMany({
                  where: { id: { in: Array.from(ids.user) } },
                  select: { id: true, firstName: true, lastName: true, email: true },
              })
            : [],
        ids.product.size
            ? prisma.product.findMany({
                  where: { id: { in: Array.from(ids.product) } },
                  select: { id: true, sku: true, category: true },
              })
            : [],
        ids.deal.size
            ? prisma.deal.findMany({
                  where: { id: { in: Array.from(ids.deal) } },
                  select: { id: true, title: true, counterparty: { select: { name: true } } },
              })
            : [],
        ids.project.size
            ? prisma.project.findMany({
                  where: { id: { in: Array.from(ids.project) } },
                  select: { id: true, internalName: true, externalAuctionId: true },
              })
            : [],
    ])

    return {
        counterparty: new Map(counterparties.map(x => [x.id, x.name])),
        contact: new Map(contacts.map(c => [c.id, contactName(c)])),
        user: new Map(users.map(u => [u.id, fullName(u)])),
        product: new Map(products.map(p => [p.id, `${p.sku} · ${p.category}`])),
        deal: new Map(deals.map(d => [d.id, dealTitle(d)])),
        project: new Map(projects.map(p => [p.id, projectTitle(p)])),
    }
}

function resolveValue(map, id) {
    if (id == null) return null
    return map.get(id) || id
}

function applyResolution(item, lookup) {
    if (!item.changes) return item
    const map = RELATION_FIELDS[item.entityType] || {}
    const next = { ...item.changes }

    for (const [field, cfg] of Object.entries(map)) {
        const v = next[field]
        if (v == null) continue
        const m = lookup[cfg.model]
        if (typeof v === "object" && ("from" in v || "to" in v)) {
            next[field] = {
                from: v.from == null ? null : resolveValue(m, v.from),
                to: v.to == null ? null : resolveValue(m, v.to),
            }
        } else if (typeof v === "string") {
            next[field] = resolveValue(m, v)
        }
    }

    for (const [field, v] of Object.entries(next)) {
        if (v == null) continue
        if (typeof v === "object" && ("from" in v || "to" in v)) {
            const from = enumValueLabel(item.entityType, field, v.from)
            const to = enumValueLabel(item.entityType, field, v.to)
            if (from !== v.from || to !== v.to) {
                next[field] = { from, to }
            }
        } else if (typeof v === "string") {
            const mapped = enumValueLabel(item.entityType, field, v)
            if (mapped !== v) next[field] = mapped
        }
    }

    return { ...item, changes: next }
}

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

    const lookup = await resolveRelations(mapped)
    const resolved = mapped.map(it => applyResolution(it, lookup))

    return Response.json({ items: resolved })
}
