import prisma from "@/lib/client"
import { requireCrmSession } from "@/lib/crm/session"
import { logChange } from "@/lib/crm/change-log"
import { ensureCustomerCounterparty, resolveDealClient } from "@/lib/crm/tenders"
import { inheritedDealDiscount } from "@/lib/crm/discount"
import { dealProjectPartiesError } from "@/lib/crm/access"
import { findDealCandidates, linkTenderToDeal } from "@/lib/crm/tender-duplicates"

/**
 * Решение менеджера по входящей закупке.
 *
 *   { decision: "SKIPPED", skipReason }  — закупка не наша, остаётся в истории;
 *                                           взятую в работу так отменяет только
 *                                           администратор, и закупка при этом
 *                                           отвязывается от сделки
 *   { decision: "TAKEN", counterpartyId } — участвуем: заводим аукционную сделку
 *   { decision: "TAKEN", dealId }         — участвуем: закупка идёт в уже
 *                                           заведённую сделку
 *   { decision: "TAKEN", force: true }    — новая сделка вопреки найденным дублям
 *   { decision: "NEW" }                   — вернуть в разбор
 *
 * counterpartyId — клиент, которому продаём. Если не передан, он выбирается по
 * правилу из resolveDealClient: есть проект по этому конечному потребителю —
 * клиентом становится дистрибьютор из проекта, нет проекта — наша организация.
 *
 * Перед созданием сделки ищем, не ведётся ли эта закупка уже: менеджер продаж
 * заводит аукционную сделку после разговора с врачом, до публикации закупки, и
 * без проверки в CRM появляется вторая сделка по той же продаже. Нашлись
 * кандидаты — отвечаем 409 со списком, а привязать или всё-таки завести новую
 * решает менеджер вторым запросом (dealId или force).
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
        // Отменить участие может только администратор: по такой закупке уже
        // заведена сделка, и «Мимо» здесь — не решение по входящему потоку, а
        // исправление чужой ошибки.
        if (tender.decision === "TAKEN" && session.user.role !== "ADMIN") {
            return Response.json(
                { error: "Отменить участие в закупке может только администратор" },
                { status: 403 },
            )
        }

        const unlinkedDealId = tender.dealId || null

        const updated = await prisma.$transaction(async tx => {
            const next = await tx.tender.update({
                where: { id: tender.id },
                data: {
                    decision: "SKIPPED",
                    skipReason: body?.skipReason?.trim() || null,
                    decisionAt: new Date(),
                    decisionById: session.user.id,
                    // Закупка в «Мимо» не может числиться в сделке: карточка
                    // показывала бы её в блоке «Закупка», а доска аукционов
                    // считала бы сроки по отменённой процедуре. Саму сделку не
                    // трогаем — статус ей ставит администратор руками, как и
                    // везде в CRM.
                    dealId: null,
                },
            })
            if (unlinkedDealId) {
                await logChange(tx, {
                    entityType: "Deal",
                    entityId: unlinkedDealId,
                    action: "UPDATE",
                    payload: {
                        source: "Tenderland",
                        tenderlandId: tender.tenderlandId,
                        unlinkedTender: tender.regNumber || tender.tenderlandId,
                    },
                    authorId: session.user.id,
                })
            }
            return next
        })

        // UI подписывает тост: сделка осталась, и с ней админу ещё разбираться.
        return Response.json({ ok: true, tender: updated, unlinkedDealId })
    }

    if (decision === "NEW") {
        const updated = await prisma.tender.update({
            where: { id: tender.id },
            // Отметку о решении не стираем, а переставляем на возврат: по
            // непустому decisionAt автоувод просроченных (autoSkipExpiredTenders)
            // понимает, что закупку вернули в разбор осознанно, и той же ночью
            // её обратно в «Мимо» не отправит.
            data: {
                decision: "NEW",
                skipReason: null,
                decisionAt: new Date(),
                decisionById: session.user.id,
            },
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

    // Менеджер выбрал сделку в диалоге дублей — закупка едет в неё.
    if (body?.dealId) {
        const deal = await prisma.deal.findUnique({
            where: { id: body.dealId },
            select: {
                id: true,
                title: true,
                isAuction: true,
                purchaseNumber: true,
                auctionUrl: true,
                nmck: true,
                bidsDeadlineAt: true,
                auctionAt: true,
                auctionCustomerId: true,
            },
        })
        if (!deal) return Response.json({ error: "Сделка не найдена" }, { status: 400 })

        const { filled, replaced } = await prisma.$transaction(tx =>
            linkTenderToDeal(tx, {
                tender,
                deal,
                auctionCustomerId,
                userId: session.user.id,
            }),
        )

        return Response.json({
            ok: true,
            dealId: deal.id,
            linked: true,
            dealTitle: deal.title,
            // UI подписывает тост: менеджер должен видеть, что закупка
            // дозаполнила в чужой сделке и что в ней заменила.
            filled,
            replaced,
        })
    }

    // Дубли ищем только когда менеджер ещё не решил: force означает «я видел
    // список и всё равно завожу новую».
    if (!body?.force) {
        const candidates = await findDealCandidates(tender)
        if (candidates.length) {
            return Response.json(
                {
                    error: "Похоже, эта закупка уже в работе",
                    candidates: candidates.map(({ deal, confidence, reasons }) => ({
                        id: deal.id,
                        title: deal.title,
                        status: deal.status,
                        isAuction: deal.isAuction,
                        purchaseNumber: deal.purchaseNumber,
                        nmck: deal.nmck,
                        bidsDeadlineAt: deal.bidsDeadlineAt,
                        auctionAt: deal.auctionAt,
                        clientName: deal.counterparty?.name || null,
                        customerName: deal.auctionCustomer?.name || null,
                        managerName:
                            [deal.manager?.lastName, deal.manager?.firstName]
                                .filter(Boolean)
                                .join(" ") || null,
                        tenders: deal.tenders.map(t => ({
                            regNumber: t.regNumber,
                            typeName: t.typeName,
                        })),
                        confidence,
                        reasons,
                    })),
                },
                { status: 409 },
            )
        }
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
