import prisma from "@/lib/client"
import { requireCrmSession } from "@/lib/crm/session"
import { requireAdmin } from "@/lib/crm/admin"
import {
    DEAL_TRACKED_FIELDS,
    parseDealPayload,
} from "@/lib/crm/deal"
import { diffEntities, logChange, snapshotEntity } from "@/lib/crm/change-log"
import {
    DEAL_DELETABLE_STATUSES,
    DEAL_DELETE_STATUS_ERROR,
    DEAL_DISCOUNT_SHIPPED_ERROR,
    DEAL_PARTIES_LOCKED_ERROR,
    dealItemShipmentUsage,
    dealLockResponse,
    dealProjectPartiesError,
} from "@/lib/crm/access"
import {
    deleteEntityTail,
    deleteEntityTails,
    deleteOrphanTasks,
    removeStoredFiles,
} from "@/lib/crm/cascade"

const COUNTERPARTY_SELECT = { id: true, name: true, type: true, region: true }
// Плательщика показывают вместе с реквизитами — их переносят в счёт (счета
// выставляют в 1С, поэтому важно, чтобы данные были под рукой и без опечаток).
const PAYER_SELECT = {
    id: true,
    name: true,
    type: true,
    region: true,
    inn: true,
    kpp: true,
    ogrn: true,
    address: true,
    bankName: true,
    bankAccount: true,
    bankCorrAccount: true,
    bik: true,
}
const MANAGER_SELECT = { id: true, firstName: true, lastName: true, email: true }
const CONTACT_SELECT = {
    id: true,
    firstName: true,
    lastName: true,
    phone: true,
    email: true,
    position: true,
}

// Форма присылает скидку при каждом сохранении, поэтому «менялась ли она»
// решаем по значению: Decimal из БД против строки из payload, null ≠ 0.
function decimalChanged(next, current) {
    const a = next === null || next === undefined || next === "" ? null : Number(next)
    const b = current === null || current === undefined ? null : Number(current)
    return a !== b
}

export async function GET(_request, { params }) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    const item = await prisma.deal.findUnique({
        where: { id: params.id },
        include: {
            counterparty: { select: COUNTERPARTY_SELECT },
            payer: { select: PAYER_SELECT },
            manager: { select: MANAGER_SELECT },
            createdBy: { select: MANAGER_SELECT },
            updatedBy: { select: MANAGER_SELECT },
            contact: { select: CONTACT_SELECT },
            auctionCustomer: { select: COUNTERPARTY_SELECT },
            auctionCustomerContact: { select: CONTACT_SELECT },
            items: { orderBy: { createdAt: "asc" } },
            shipments: {
                select: {
                    number: true,
                    status: true,
                    items: { select: { dealItemId: true, quantity: true } },
                },
            },
            sourceProject: {
                select: { id: true, internalName: true, externalAuctionId: true },
            },
        },
    })
    if (!item) return Response.json({ error: "Не найдено" }, { status: 404 })

    // Позиции отдаём вместе с их «отгруженностью»: раздел товарных позиций
    // блокирует правку тех строк, что попали в проведённый документ.
    const { shipments, ...deal } = item
    return Response.json({
        item: {
            ...deal,
            items: deal.items.map(i => ({ ...i, ...dealItemShipmentUsage(i.id, shipments) })),
        },
    })
}

export async function PATCH(request, { params }) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    const existing = await prisma.deal.findUnique({ where: { id: params.id } })
    if (!existing) return Response.json({ error: "Не найдено" }, { status: 404 })

    // Проверяем текущий статус: перевести сделку В «Закрыто»/«Не реализована»
    // менеджер может, а изменить её после этого — уже нет.
    const locked = dealLockResponse(existing.status, session)
    if (locked) return locked

    let body
    try {
        body = await request.json()
    } catch {
        return Response.json({ error: "Некорректный JSON" }, { status: 400 })
    }

    const { data, error } = parseDealPayload(body, { partial: true })
    if (error) return Response.json({ error }, { status: 400 })

    // Причина проигрыша: обязательна при переводе в CANCELLED,
    // очищается при возврате сделки в работу.
    if (data.status === "CANCELLED" && !data.lossReason && !existing.lossReason) {
        return Response.json(
            { error: "Укажите причину, по которой сделка не реализована" },
            { status: 400 },
        )
    }
    if (data.status && data.status !== "CANCELLED" && data.status !== "ARCHIVED") {
        if (existing.lossReason && data.lossReason === undefined) data.lossReason = null
        if (existing.lossComment && data.lossComment === undefined) data.lossComment = null
    }

    // Скидка входит в расчёт сумм отгрузки (priceFactor в
    // calculateDealShipmentProgress), поэтому после проведения документа она
    // фиксируется — иначе запрет на правку позиций обходится через скидку.
    if (data.discount !== undefined && decimalChanged(data.discount, existing.discount)) {
        const shipped = await prisma.shipment.count({
            where: { dealId: params.id, status: "SHIPPED" },
        })
        if (shipped > 0) {
            return Response.json({ error: DEAL_DISCOUNT_SHIPPED_ERROR }, { status: 403 })
        }
    }

    // Привязку к проекту не переставляют: иначе запрет на смену сторон
    // обходится отвязкой и повторной привязкой к другому проекту.
    if (
        existing.sourceProjectId &&
        data.sourceProjectId !== undefined &&
        data.sourceProjectId !== existing.sourceProjectId
    ) {
        return Response.json({ error: DEAL_PARTIES_LOCKED_ERROR }, { status: 400 })
    }

    // Стороны сделки с проектом сверяем с самим проектом, а не с прежними
    // значениями: заказчик, подставленный из проекта при включении галки
    // «аукцион», — это нормальное изменение, а не подмена. Значения, которые не
    // трогают, не проверяем — старые записи с рассинхроном остаются
    // редактируемыми (и их можно привести к проекту).
    const linkingProject =
        data.sourceProjectId !== undefined && data.sourceProjectId !== existing.sourceProjectId
    const projectId = linkingProject ? data.sourceProjectId : existing.sourceProjectId
    if (projectId) {
        // При новой привязке проверяем итоговые стороны сделки, при обычном
        // редактировании — только те, что реально меняются.
        const pick = field => {
            if (linkingProject) {
                return data[field] !== undefined ? data[field] : existing[field]
            }
            return data[field] && data[field] !== existing[field] ? data[field] : null
        }
        const parties = {
            counterpartyId: pick("counterpartyId"),
            auctionCustomerId: pick("auctionCustomerId"),
        }
        if (parties.counterpartyId || parties.auctionCustomerId) {
            const project = await prisma.project.findUnique({
                where: { id: projectId },
                select: { distributorId: true, endCustomerId: true },
            })
            const partiesError = dealProjectPartiesError(project, parties)
            if (partiesError) return Response.json({ error: partiesError }, { status: 400 })
        }
    }

    if (data.counterpartyId) {
        const cp = await prisma.counterparty.findUnique({
            where: { id: data.counterpartyId },
            select: { id: true },
        })
        if (!cp) return Response.json({ error: "Клиент не найден" }, { status: 400 })
    }
    if (data.contactId) {
        const targetCp = data.counterpartyId ?? existing.counterpartyId
        const c = await prisma.contact.findUnique({
            where: { id: data.contactId },
            select: { counterpartyId: true },
        })
        if (!c || c.counterpartyId !== targetCp) {
            return Response.json(
                { error: "Контакт не принадлежит выбранному клиенту" },
                { status: 400 },
            )
        }
    }
    if (data.payerId) {
        // Плательщик, совпадающий с клиентом, — это отсутствие плательщика.
        const targetCp = data.counterpartyId ?? existing.counterpartyId
        if (data.payerId === targetCp) data.payerId = null
        else {
            const p = await prisma.counterparty.findUnique({
                where: { id: data.payerId },
                select: { id: true },
            })
            if (!p) return Response.json({ error: "Плательщик не найден" }, { status: 400 })
        }
    }
    if (data.managerId) {
        const m = await prisma.user.findUnique({
            where: { id: data.managerId },
            select: { status: true },
        })
        if (!m || m.status !== "ACTIVE") {
            return Response.json({ error: "Менеджер не найден" }, { status: 400 })
        }
    }
    if (data.auctionCustomerId) {
        const cust = await prisma.counterparty.findUnique({
            where: { id: data.auctionCustomerId },
            select: { id: true },
        })
        if (!cust) return Response.json({ error: "Заказчик не найден" }, { status: 400 })
    }
    if (data.auctionCustomerContactId) {
        const targetCust = data.auctionCustomerId ?? existing.auctionCustomerId
        const c = await prisma.contact.findUnique({
            where: { id: data.auctionCustomerContactId },
            select: { counterpartyId: true },
        })
        if (!c || c.counterpartyId !== targetCust) {
            return Response.json(
                { error: "Контакт не принадлежит заказчику" },
                { status: 400 },
            )
        }
    }

    const updated = await prisma.$transaction(async tx => {
        const deal = await tx.deal.update({
            where: { id: params.id },
            data: {
                ...data,
                updatedById: session.user.id ?? null,
            },
            include: {
                counterparty: { select: COUNTERPARTY_SELECT },
                payer: { select: PAYER_SELECT },
                manager: { select: MANAGER_SELECT },
                createdBy: { select: MANAGER_SELECT },
                updatedBy: { select: MANAGER_SELECT },
                contact: { select: CONTACT_SELECT },
                items: true,
            },
        })
        const changes = diffEntities(existing, deal, DEAL_TRACKED_FIELDS)
        if (Object.keys(changes).length > 0) {
            await logChange(tx, {
                entityType: "Deal",
                entityId: deal.id,
                action: "UPDATE",
                payload: changes,
                authorId: session.user.id,
            })
        }
        return deal
    })
    return Response.json({ item: updated })
}

export async function DELETE(_request, { params }) {
    const { session, response } = await requireAdmin()
    if (!session) return response

    const existing = await prisma.deal.findUnique({ where: { id: params.id } })
    if (!existing) return Response.json({ error: "Не найдено" }, { status: 404 })

    if (!DEAL_DELETABLE_STATUSES.includes(existing.status)) {
        return Response.json({ error: DEAL_DELETE_STATUS_ERROR }, { status: 400 })
    }

    // Отгрузки уедут каскадом вместе со сделкой, но их заметки и файлы
    // привязаны полиморфно — снимаем их отдельно, пока отгрузки ещё есть.
    const shipments = await prisma.shipment.findMany({
        where: { dealId: params.id },
        select: { id: true },
    })

    const storageKeys = await prisma.$transaction(async tx => {
        const keys = await deleteEntityTail(tx, "Deal", existing.id)
        keys.push(...(await deleteEntityTails(tx, "Shipment", shipments.map(s => s.id))))
        await deleteOrphanTasks(tx, { dealId: existing.id })
        await tx.deal.delete({ where: { id: params.id } })
        await logChange(tx, {
            entityType: "Deal",
            entityId: existing.id,
            action: "DELETE",
            payload: snapshotEntity(existing, DEAL_TRACKED_FIELDS),
            authorId: session.user.id,
        })
        return keys
    })

    await removeStoredFiles(storageKeys)
    return Response.json({ ok: true })
}
