// Выборки к журналу изменений: превращают идентификаторы в имена.
//
// Записи ChangeLog хранят только id — и цели («в какой карточке это
// произошло»), и значений полей внутри changes (managerId, productId…).
// Разворачивание идёт двумя батчами, а не запросом на запись: лента карточки,
// лента на главной и отчёт по активности читают одни и те же записи пачками.
import prisma from "@/lib/client"
import { changeTarget, enumValueLabel, normalizeEntityType } from "./change-log"
import { dealDisplayTitle } from "./deal"

// Поля-ссылки: какое поле какой сущностью разворачивать. Всё, чего здесь нет,
// в ленте останется как есть — для текстов и чисел это и нужно.
const RELATION_FIELDS = {
    Counterparty: {
        managerId: { model: "user" },
        groupId: { model: "counterpartyGroup" },
    },
    Deal: {
        counterpartyId: { model: "counterparty" },
        payerId: { model: "counterparty" },
        contactId: { model: "contact" },
        managerId: { model: "user" },
        sourceProjectId: { model: "project" },
        // Записи о сделке, заведённой по закупке, до перехода на sourceProjectId
        // клали идентификатор проекта в projectId — их тоже разворачиваем.
        projectId: { model: "project" },
        auctionCustomerId: { model: "counterparty" },
        auctionCustomerContactId: { model: "contact" },
    },
    DealItem: {
        productId: { model: "product" },
    },
    Project: {
        distributorId: { model: "counterparty" },
        endCustomerId: { model: "counterparty" },
        managerId: { model: "user" },
        duplicateOfId: { model: "project" },
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
    return `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() || c.email || c.phone || null
}

function dealTitle(d) {
    if (!d) return null
    return dealDisplayTitle(d, d.counterparty?.name)
}

function projectTitle(p) {
    if (!p) return null
    return p.internalName || p.externalAuctionId || null
}

async function resolveRelations(items) {
    const ids = {
        counterparty: new Set(),
        counterpartyGroup: new Set(),
        contact: new Set(),
        user: new Set(),
        product: new Set(),
        deal: new Set(),
        project: new Set(),
    }

    for (const it of items) {
        const map = RELATION_FIELDS[normalizeEntityType(it.entityType)]
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

    const [counterparties, groups, contacts, users, products, deals, projects] = await Promise.all([
        ids.counterparty.size
            ? prisma.counterparty.findMany({
                  where: { id: { in: Array.from(ids.counterparty) } },
                  select: { id: true, name: true },
              })
            : [],
        ids.counterpartyGroup.size
            ? prisma.counterpartyGroup.findMany({
                  where: { id: { in: Array.from(ids.counterpartyGroup) } },
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
                  select: {
                      id: true,
                      title: true,
                      counterparty: { select: { name: true } },
                      sourceProject: { select: { internalName: true } },
                  },
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
        counterpartyGroup: new Map(groups.map(x => [x.id, x.name])),
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
    const entityType = normalizeEntityType(item.entityType)
    const map = RELATION_FIELDS[entityType] || {}
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
            const from = enumValueLabel(entityType, field, v.from)
            const to = enumValueLabel(entityType, field, v.to)
            if (from !== v.from || to !== v.to) {
                next[field] = { from, to }
            }
        } else if (typeof v === "string") {
            const mapped = enumValueLabel(entityType, field, v)
            if (mapped !== v) next[field] = mapped
        }
    }

    return { ...item, changes: next }
}

/**
 * Разворачивает ссылки внутри changes: id менеджера → имя, id товара →
 * «артикул · категория», enum → подпись. Принимает записи с уже разобранным
 * JSON (changes — объект), возвращает их же копии с человекочитаемыми
 * значениями.
 */
export async function resolveChangeRelations(items) {
    const lookup = await resolveRelations(items)
    return items.map(it => applyResolution(it, lookup))
}

/**
 * Имена карточек-целей для пачки записей журнала: { Deal: Map<id, name>, … }.
 * Тип берётся из родителя, если он есть, — дочерняя запись показывается в
 * ленте именем карточки, к которой относится.
 *
 * Карточек, у которых нет своей страницы (задача, заявка с сайта), здесь нет
 * намеренно: переходить всё равно некуда, а имя не спасает от лишнего запроса.
 */
export async function resolveChangeTargets(changes) {
    const ids = { Deal: new Set(), Project: new Set(), Counterparty: new Set(), Product: new Set(), Shipment: new Set() }

    for (const c of changes) {
        const { type, id } = changeTarget(c)
        if (id && ids[type]) ids[type].add(id)
    }

    const [deals, projects, counterparties, products, shipments] = await Promise.all([
        ids.Deal.size
            ? prisma.deal.findMany({
                  where: { id: { in: Array.from(ids.Deal) } },
                  select: {
                      id: true,
                      title: true,
                      counterparty: { select: { name: true } },
                      sourceProject: { select: { internalName: true } },
                  },
              })
            : [],
        ids.Project.size
            ? prisma.project.findMany({
                  where: { id: { in: Array.from(ids.Project) } },
                  select: { id: true, internalName: true, externalAuctionId: true },
              })
            : [],
        ids.Counterparty.size
            ? prisma.counterparty.findMany({
                  where: { id: { in: Array.from(ids.Counterparty) } },
                  select: { id: true, name: true },
              })
            : [],
        ids.Product.size
            ? prisma.product.findMany({
                  where: { id: { in: Array.from(ids.Product) } },
                  select: { id: true, sku: true, name: true },
              })
            : [],
        ids.Shipment.size
            ? prisma.shipment.findMany({
                  where: { id: { in: Array.from(ids.Shipment) } },
                  select: { id: true, number: true },
              })
            : [],
    ])

    return {
        Deal: new Map(deals.map(d => [d.id, dealTitle(d)])),
        Project: new Map(projects.map(p => [p.id, projectTitle(p)])),
        Counterparty: new Map(counterparties.map(c => [c.id, c.name])),
        Product: new Map(products.map(p => [p.id, p.name ? `${p.sku} · ${p.name}` : p.sku])),
        Shipment: new Map(shipments.map(s => [s.id, `Отгрузка ${s.number}`])),
    }
}
