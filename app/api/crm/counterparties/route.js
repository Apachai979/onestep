import prisma from "@/lib/client"
import { requireCrmSession } from "@/lib/crm/session"
import {
    COUNTERPARTY_PRIORITIES,
    COUNTERPARTY_TYPES,
    parseCounterpartyPayload,
} from "@/lib/crm/counterparty"
import { closedRevenueByCounterparty } from "@/lib/crm/revenue"
import { logChange, snapshotEntity } from "@/lib/crm/change-log"

const COUNTERPARTY_TRACKED_FIELDS = [
    "type",
    "name",
    "region",
    "city",
    "inn",
    "kpp",
    "ogrn",
    "okpo",
    "okved",
    "bankName",
    "bankAccount",
    "bankCorrAccount",
    "bik",
    "totalRevenue",
    "discount",
    "phone",
    "email",
    "website",
    "address",
    "source",
    "companyKind",
    "activityArea",
    "priority",
    "note",
    "managerId",
]

export async function GET(request) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")
    const q = searchParams.get("q")?.trim()
    const region = searchParams.get("region")?.trim()
    const city = searchParams.get("city")?.trim()
    const managerId = searchParams.get("managerId")?.trim()
    const priority = searchParams.get("priority")?.trim()

    const where = {}
    if (type) {
        if (!COUNTERPARTY_TYPES.includes(type)) {
            return Response.json({ error: "Некорректный тип" }, { status: 400 })
        }
        where.type = type
    }
    if (managerId) where.managerId = managerId
    // «none» — карточки без проставленного приоритета.
    if (priority) {
        if (priority === "none") where.priority = null
        else if (COUNTERPARTY_PRIORITIES.includes(Number(priority)))
            where.priority = Number(priority)
        else return Response.json({ error: "Некорректный приоритет" }, { status: 400 })
    }

    const items = await prisma.counterparty.findMany({
        where,
        orderBy: { name: "asc" },
        include: {
            manager: {
                select: { id: true, firstName: true, lastName: true, email: true },
            },
            // Все контакты, основной — первым: список показывает contacts[0]
            // как основной, а поиск фильтрует по всем контактам (не только по
            // основному).
            contacts: {
                orderBy: [{ isPrimary: "desc" }, { lastName: "asc" }, { firstName: "asc" }],
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    phone: true,
                    email: true,
                    position: true,
                    isPrimary: true,
                },
            },
        },
    })

    const filtered = items.filter(it => {
        if (region) {
            const r = region.toLowerCase()
            if (!(it.region || "").toLowerCase().includes(r)) return false
        }
        if (city) {
            const c = city.toLowerCase()
            if (!(it.city || "").toLowerCase().includes(c)) return false
        }
        if (q) {
            const ql = q.toLowerCase()
            const inName = (it.name || "").toLowerCase().includes(ql)
            const inInn = (it.inn || "").toLowerCase().includes(ql)
            const inContact = it.contacts?.some(c => {
                const fn = `${c.firstName ?? ""} ${c.lastName ?? ""}`.toLowerCase()
                return (
                    fn.includes(ql) ||
                    (c.email || "").toLowerCase().includes(ql) ||
                    (c.phone || "").toLowerCase().includes(ql)
                )
            })
            if (!inName && !inInn && !inContact) return false
        }
        return true
    })

    // Оборот по закрытым сделкам — одним запросом на весь отфильтрованный
    // список, а не по контрагенту.
    const revenue = await closedRevenueByCounterparty(
        prisma,
        filtered.map(it => it.id),
    )

    return Response.json({
        items: filtered.map(it => ({ ...it, closedRevenue: revenue.get(it.id) || 0 })),
    })
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

    const { data, error } = parseCounterpartyPayload(body)
    if (error) return Response.json({ error }, { status: 400 })

    if (data.managerId) {
        const m = await prisma.user.findUnique({
            where: { id: data.managerId },
            select: { status: true },
        })
        if (!m || m.status !== "ACTIVE") {
            return Response.json({ error: "Менеджер не найден" }, { status: 400 })
        }
    }

    if (data.inn) {
        const existing = await prisma.counterparty.findFirst({
            where: { inn: data.inn, kpp: data.kpp ?? null },
            select: { id: true, name: true, type: true, inn: true, kpp: true },
        })
        if (existing) {
            const kppText = data.kpp ? `, КПП ${data.kpp}` : " (без КПП)"
            return Response.json(
                {
                    error: "counterparty_exists",
                    message: `Контрагент с ИНН ${data.inn}${kppText} уже есть: «${existing.name}»`,
                    existing,
                },
                { status: 409 },
            )
        }
    }

    try {
        const created = await prisma.$transaction(async tx => {
            const cp = await tx.counterparty.create({
                data: {
                    ...data,
                    createdById: session.user.id ?? null,
                },
            })
            await logChange(tx, {
                entityType: "Counterparty",
                entityId: cp.id,
                action: "CREATE",
                payload: snapshotEntity(cp, COUNTERPARTY_TRACKED_FIELDS),
                authorId: session.user.id,
            })
            return cp
        })
        return Response.json({ item: created }, { status: 201 })
    } catch (err) {
        console.error("[counterparties.POST] error:", err)
        return Response.json(
            { error: `Ошибка сохранения: ${err.message}` },
            { status: 500 },
        )
    }
}
