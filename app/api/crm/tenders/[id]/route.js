import prisma from "@/lib/client"
import { requireCrmSession } from "@/lib/crm/session"
import { logChange } from "@/lib/crm/change-log"
import { ensureCustomerCounterparty, resolveDealClient } from "@/lib/crm/tenders"
import { inheritedDealDiscount } from "@/lib/crm/discount"
import { dealProjectPartiesError } from "@/lib/crm/access"

/**
 * Решение менеджера по входящей закупке.
 *
 *   { decision: "SKIPPED", skipReason }  — закупка не наша, остаётся в истории
 *   { decision: "TAKEN", counterpartyId } — участвуем: заводим аукционную сделку
 *   { decision: "NEW" }                   — вернуть в разбор
 *
 * counterpartyId — клиент, которому продаём. Если не передан, он выбирается по
 * правилу из resolveDealClient: есть проект по этому конечному потребителю —
 * клиентом становится дистрибьютор из проекта, нет проекта — наша организация.
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

    // Клиента можно задать явно (менеджер знает лучше), иначе выбираем по
    // правилу: есть проект по этому потребителю — продаём через его
    // дистрибьютора, нет проекта — поставляем сами.
    const resolved = body?.counterpartyId
        ? { counterpartyId: body.counterpartyId, source: "MANUAL", project: null }
        : await resolveDealClient(auctionCustomerId)

    const client = await prisma.counterparty.findUnique({
        where: { id: resolved.counterpartyId },
        select: {
            id: true,
            name: true,
            discount: true,
            group: { select: { name: true, discount: true } },
        },
    })
    if (!client) return Response.json({ error: "Клиент не найден" }, { status: 400 })

    // Скидка по той же цепочке, что и везде в CRM: проект → клиент/группа.
    // Это снимок на момент создания — дальше сделка живёт со своей скидкой.
    const discount = inheritedDealDiscount(resolved.project, client).value

    // Сделку привязываем к проекту только когда дистрибьютор взят оттуда же:
    // у сделки с проектом-источником клиент обязан совпадать с дистрибьютором
    // проекта, а заказчик — с его конечным потребителем. Клиента, выбранного
    // менеджером вручную, это правило может не пройти, поэтому там связи нет.
    const sourceProjectId =
        resolved.source === "PROJECT_DISTRIBUTOR" ? resolved.project.id : null
    if (sourceProjectId) {
        const partiesError = dealProjectPartiesError(resolved.project, {
            counterpartyId: client.id,
            auctionCustomerId,
        })
        if (partiesError) return Response.json({ error: partiesError }, { status: 400 })
    }

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
                counterpartyId: client.id,
                auctionCustomerId,
                discount,
                sourceProjectId,
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
            entityType: "Deal",
            entityId: created.id,
            action: "CREATE",
            payload: {
                source: "Tenderland",
                tenderlandId: tender.tenderlandId,
                clientSource: resolved.source,
                sourceProjectId,
            },
            authorId: session.user.id,
        })

        return created
    })

    return Response.json({
        ok: true,
        dealId: deal.id,
        // UI подписывает тост: менеджер должен видеть, кто стал клиентом и почему.
        clientSource: resolved.source,
        clientName: client.name,
        projectName: resolved.project?.internalName || null,
    })
}
