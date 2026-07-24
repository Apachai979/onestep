import prisma from "@/lib/client"
import { requireCrmSession } from "@/lib/crm/session"
import { parseCounterpartyPayload } from "@/lib/crm/counterparty"
import { diffEntities, logChange } from "@/lib/crm/change-log"

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
    "address",
    "source",
    "companyKind",
    "activityArea",
    "note",
    "managerId",
]

export async function GET(_request, { params }) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    const item = await prisma.counterparty.findUnique({
        where: { id: params.id },
        include: {
            createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
            updatedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
            contacts: { orderBy: [{ isPrimary: "desc" }, { lastName: "asc" }, { firstName: "asc" }] },
        },
    })
    if (!item) return Response.json({ error: "Не найдено" }, { status: 404 })
    return Response.json({ item })
}

export async function PATCH(request, { params }) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    const existing = await prisma.counterparty.findUnique({ where: { id: params.id } })
    if (!existing) return Response.json({ error: "Не найдено" }, { status: 404 })

    let body
    try {
        body = await request.json()
    } catch {
        return Response.json({ error: "Некорректный JSON" }, { status: 400 })
    }

    const { data, error } = parseCounterpartyPayload(body, { partial: true })
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

    const nextInn = "inn" in data ? data.inn : existing.inn
    const nextKpp = "kpp" in data ? data.kpp : existing.kpp
    const pairChanged = nextInn !== existing.inn || nextKpp !== existing.kpp
    if (nextInn && pairChanged) {
        const clash = await prisma.counterparty.findFirst({
            where: {
                inn: nextInn,
                kpp: nextKpp ?? null,
                NOT: { id: params.id },
            },
            select: { id: true, name: true, type: true, inn: true, kpp: true },
        })
        if (clash) {
            const kppText = nextKpp ? `, КПП ${nextKpp}` : " (без КПП)"
            return Response.json(
                {
                    error: "counterparty_exists",
                    message: `Контрагент с ИНН ${nextInn}${kppText} уже есть: «${clash.name}»`,
                    existing: clash,
                },
                { status: 409 },
            )
        }
    }

    try {
        const updated = await prisma.$transaction(async tx => {
            const cp = await tx.counterparty.update({
                where: { id: params.id },
                data: {
                    ...data,
                    updatedById: session.user.id ?? null,
                },
            })
            const changes = diffEntities(existing, cp, COUNTERPARTY_TRACKED_FIELDS)
            if (Object.keys(changes).length > 0) {
                await logChange(tx, {
                    entityType: "Counterparty",
                    entityId: cp.id,
                    action: "UPDATE",
                    payload: changes,
                    authorId: session.user.id,
                })
            }
            return cp
        })
        return Response.json({ item: updated })
    } catch (err) {
        console.error("[counterparties.PATCH] error:", err)
        return Response.json(
            { error: `Ошибка сохранения: ${err.message}` },
            { status: 500 },
        )
    }
}
