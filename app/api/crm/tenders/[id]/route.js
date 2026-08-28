import prisma from "@/lib/client"
import { requireCrmSession } from "@/lib/crm/session"
import { logChange } from "@/lib/crm/change-log"
import { ensureCustomerCounterparty } from "@/lib/crm/tenders"

/**
 * Решение менеджера по входящей закупке.
 *
 *   { decision: "SKIPPED", skipReason }  — закупка не наша, остаётся в истории
 *   { decision: "TAKEN", counterpartyId } — участвуем: заводим аукционную сделку
 *   { decision: "NEW" }                   — вернуть в разбор
 *
 * counterpartyId — клиент, которому продаём. Не передан — продаём напрямую
 * заказчику закупки, и клиентом становится он же (частый случай в госзакупках).
 */
export async function PATCH(request, { params }) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    let body
    try {
        body = await request.json()
    } catch {
        return Response.json({ error: "Некорректный JSON" }, { status: 400 })
    }

    const tender = await prisma.tender.findUnique({ where: { id: params.id } })
    if (!tender) return Response.json({ error: "Закупка не найдена" }, { status: 404 })

    const decision = body?.decision
    if (decision === "SKIPPED") {
        const updated = await prisma.tender.update({
            where: { id: tender.id },
            data: {
                decision: "SKIPPED",
                skipReason: body?.skipReason?.trim() || null,
                decisionAt: new Date(),
                decisionById: session.user.id,
            },
        })
        return Response.json({ ok: true, tender: updated })
    }

    if (decision === "NEW") {
        const updated = await prisma.tender.update({
            where: { id: tender.id },
            data: { decision: "NEW", skipReason: null, decisionAt: null, decisionById: null },
        })
        return Response.json({ ok: true, tender: updated })
    }

    if (decision !== "TAKEN") {
        return Response.json({ error: "Некорректное решение" }, { status: 400 })
    }

    if (tender.dealId) {
        return Response.json(
            { error: "По этой закупке сделка уже заведена", dealId: tender.dealId },
            { status: 409 },
        )
    }

    // Заказчик закупки нужен в любом случае: у аукционной сделки он обязателен.
    const auctionCustomerId = await ensureCustomerCounterparty(tender, session.user.id)
    if (!auctionCustomerId) {
        return Response.json(
            { error: "В закупке нет ИНН заказчика — заведите сделку вручную" },
            { status: 400 },
        )
    }

    const counterpartyId = body?.counterpartyId || auctionCustomerId
    const client = await prisma.counterparty.findUnique({
        where: { id: counterpartyId },
        select: { id: true },
    })
    if (!client) return Response.json({ error: "Клиент не найден" }, { status: 400 })

    const deal = await prisma.$transaction(async tx => {
        const created = await tx.deal.create({
            data: {
                title: tender.name.slice(0, 200),
                status: "NEGOTIATION",
                isAuction: true,
                purchaseNumber: tender.regNumber,
                auctionUrl: tender.sourceLink,
                nmck: tender.beginPrice,
                bidsDeadlineAt: tender.endDate,
                auctionAt: tender.biddingDate,
                counterpartyId,
                auctionCustomerId,
                managerId: session.user.id,
                createdById: session.user.id,
            },
        })

        await tx.tender.update({
            where: { id: tender.id },
            data: {
                decision: "TAKEN",
                decisionAt: new Date(),
                decisionById: session.user.id,
                dealId: created.id,
            },
        })

        await logChange(tx, {
            entityType: "DEAL",
            entityId: created.id,
            action: "CREATE",
            payload: { source: "Tenderland", tenderlandId: tender.tenderlandId },
            authorId: session.user.id,
        })

        return created
    })

    return Response.json({ ok: true, dealId: deal.id })
}
