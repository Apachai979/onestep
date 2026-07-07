import prisma from "@/lib/client"
import { requireCrmSession } from "@/lib/crm/session"
import { COUNTERPARTY_TYPES, parseCounterpartyPayload } from "@/lib/crm/counterparty"
import { logChange, snapshotEntity } from "@/lib/crm/change-log"

const COUNTERPARTY_TRACKED_FIELDS = [
    "type",
    "name",
    "region",
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
    "address",
    "source",
    "companyKind",
    "activityArea",
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

    const where = {}
    if (type) {
        if (!COUNTERPARTY_TYPES.includes(type)) {
            return Response.json({ error: "Некорректный тип" }, { status: 400 })
        }
        where.type = type
    }

    const items = await prisma.counterparty.findMany({
        where,
        orderBy: { name: "asc" },
        include: {
            contacts: {
                where: { isPrimary: true },
                take: 1,
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    phone: true,
                    email: true,
                    position: true,
                },
            },
        },
    })

    const filtered = items.filter(it => {
        if (region) {
            const r = region.toLowerCase()
            if (!(it.region || "").toLowerCase().includes(r)) return false
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
