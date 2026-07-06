import prisma from "@/lib/client"
import { requireCrmSession } from "@/lib/crm/session"
import { logChange, snapshotEntity } from "@/lib/crm/change-log"
import { DEAL_TRACKED_FIELDS } from "@/lib/crm/deal"

const COUNTERPARTY_TYPES = ["DISTRIBUTOR", "END_CUSTOMER"]
const COUNTERPARTY_TRACKED_FIELDS = ["type", "name", "region", "phone", "email", "source"]

function clean(v, max = 500) {
    if (typeof v !== "string") return null
    const t = v.trim().slice(0, max)
    return t || null
}

// Конвертация заявки с сайта: контрагент (новый или существующий) +
// контакт + сделка одной транзакцией. Заявка помечается обработанной.
export async function POST(request, { params }) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    let body
    try {
        body = await request.json()
    } catch {
        return Response.json({ error: "Некорректный JSON" }, { status: 400 })
    }

    const lead = await prisma.lead.findUnique({ where: { id: params.id } })
    if (!lead) {
        return Response.json({ error: "Заявка не найдена" }, { status: 404 })
    }

    const counterpartyId = clean(body.counterpartyId)
    const newCp = body.newCounterparty || null

    let existing = null
    if (counterpartyId) {
        existing = await prisma.counterparty.findUnique({
            where: { id: counterpartyId },
            include: { contacts: true },
        })
        if (!existing) {
            return Response.json({ error: "Контрагент не найден" }, { status: 400 })
        }
    } else {
        const name = clean(newCp?.name)
        const type = clean(newCp?.type)
        const region = clean(newCp?.region)
        if (!name) return Response.json({ error: "Укажите название контрагента" }, { status: 400 })
        if (!COUNTERPARTY_TYPES.includes(type)) {
            return Response.json({ error: "Некорректный тип контрагента" }, { status: 400 })
        }
        if (!region) return Response.json({ error: "Укажите регион" }, { status: 400 })
        newCp.name = name
        newCp.type = type
        newCp.region = region
    }

    const result = await prisma.$transaction(async tx => {
        // 1. Контрагент
        let cp = existing
        if (!cp) {
            cp = await tx.counterparty.create({
                data: {
                    name: newCp.name,
                    type: newCp.type,
                    region: newCp.region,
                    phone: lead.phone,
                    email: lead.email,
                    source: "Сайт (форма обратной связи)",
                    createdById: session.user.id,
                },
                include: { contacts: true },
            })
            await logChange(tx, {
                entityType: "Counterparty",
                entityId: cp.id,
                action: "CREATE",
                payload: snapshotEntity(cp, COUNTERPARTY_TRACKED_FIELDS),
                authorId: session.user.id,
            })
        }

        // 2. Контакт: не плодим дубликаты по email/телефону
        let contact = (cp.contacts || []).find(
            c =>
                (lead.email && c.email && c.email === lead.email) ||
                (lead.phone && c.phone && c.phone === lead.phone),
        )
        if (!contact) {
            contact = await tx.contact.create({
                data: {
                    counterpartyId: cp.id,
                    firstName: lead.firstName,
                    lastName: lead.lastName,
                    phone: lead.phone,
                    email: lead.email,
                    isPrimary: (cp.contacts || []).length === 0,
                },
            })
        }

        // 3. Сделка
        const dateLabel = new Date(lead.createdAt).toLocaleDateString("ru-RU")
        const deal = await tx.deal.create({
            data: {
                title: `Заявка с сайта от ${dateLabel}`,
                status: "NEGOTIATION",
                totalAmount: "0",
                note: lead.message ? `Сообщение из заявки:\n${lead.message}` : null,
                counterpartyId: cp.id,
                contactId: contact.id,
                managerId: session.user.id,
                createdById: session.user.id,
            },
        })
        await logChange(tx, {
            entityType: "Deal",
            entityId: deal.id,
            action: "CREATE",
            payload: snapshotEntity(deal, DEAL_TRACKED_FIELDS),
            authorId: session.user.id,
        })
        // Отметка о происхождении: сделка создана из заявки с сайта.
        await logChange(tx, {
            entityType: "Lead",
            entityId: lead.id,
            parentEntityType: "Deal",
            parentEntityId: deal.id,
            action: "CREATE",
            payload: {
                name: `${lead.firstName || ""} ${lead.lastName || ""}`.trim() || null,
                company: lead.company,
                email: lead.email,
                phone: lead.phone,
            },
            authorId: session.user.id,
        })

        // 4. Заявка — обработана
        await tx.lead.update({
            where: { id: lead.id },
            data: { status: "PROCESSED", processedAt: new Date() },
        })

        return { dealId: deal.id, counterpartyId: cp.id, contactId: contact.id }
    })

    return Response.json(result, { status: 201 })
}
