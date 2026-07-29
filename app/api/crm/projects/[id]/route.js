import prisma from "@/lib/client"
import { requireCrmSession } from "@/lib/crm/session"
import {
    PROJECT_TRACKED_FIELDS,
    buildInternalName,
    duplicateProjectMessage,
    findProjectDuplicates,
    isAutoInternalName,
    isBlockingDuplicate,
    parseProjectPayload,
} from "@/lib/crm/project"
import { diffEntities, logChange, snapshotEntity } from "@/lib/crm/change-log"
import {
    PROJECT_DELETABLE_STATUSES,
    PROJECT_DELETE_HAS_DEALS_ERROR,
    PROJECT_DELETE_STATUS_ERROR,
    PROJECT_PARTIES_LOCKED_ERROR,
    projectLockResponse,
} from "@/lib/crm/access"
import { deleteEntityTail, deleteOrphanTasks, removeStoredFiles } from "@/lib/crm/cascade"
import { requireAdmin } from "@/lib/crm/admin"

const COUNTERPARTY_SELECT = { id: true, name: true, type: true, region: true }
const MANAGER_SELECT = { id: true, firstName: true, lastName: true, email: true }

export async function GET(_request, { params }) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    const item = await prisma.project.findUnique({
        where: { id: params.id },
        include: {
            distributor: { select: COUNTERPARTY_SELECT },
            endCustomer: { select: COUNTERPARTY_SELECT },
            manager: { select: MANAGER_SELECT },
            updatedBy: { select: MANAGER_SELECT },
            duplicateOf: { select: { id: true, internalName: true } },
            items: { orderBy: { createdAt: "asc" } },
            contacts: { orderBy: [{ lastName: "asc" }, { firstName: "asc" }] },
            deals: {
                orderBy: { createdAt: "desc" },
                select: {
                    id: true,
                    title: true,
                    status: true,
                    totalAmount: true,
                    discount: true,
                    counterparty: { select: { id: true, name: true } },
                },
            },
        },
    })
    if (!item) return Response.json({ error: "Не найдено" }, { status: 404 })
    return Response.json({ item })
}

export async function PATCH(request, { params }) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    const existing = await prisma.project.findUnique({ where: { id: params.id } })
    if (!existing) return Response.json({ error: "Не найдено" }, { status: 404 })

    const locked = projectLockResponse(existing.status, session)
    if (locked) return locked

    let body
    try {
        body = await request.json()
    } catch {
        return Response.json({ error: "Некорректный JSON" }, { status: 400 })
    }

    const { data, error } = parseProjectPayload(body, { partial: true })
    if (error) return Response.json({ error }, { status: 400 })

    // Причина обязательна при переводе в «Проработано, нет потребности»
    // (свободный текст в lossComment); при возврате в работу — очищается.
    if (data.status === "NO_NEED" && !data.lossComment && !existing.lossComment) {
        return Response.json(
            { error: "Укажите причину, по которой у клиента нет потребности" },
            { status: 400 },
        )
    }
    if (data.status && data.status !== "NO_NEED") {
        if (existing.lossComment && data.lossComment === undefined) data.lossComment = null
        if (existing.lossReason && data.lossReason === undefined) data.lossReason = null
    }

    // Стороны проекта фиксируются, как только по нему появилась сделка.
    const partiesChanged =
        (data.distributorId && data.distributorId !== existing.distributorId) ||
        (data.endCustomerId && data.endCustomerId !== existing.endCustomerId)
    if (partiesChanged) {
        const dealsCount = await prisma.deal.count({ where: { sourceProjectId: params.id } })
        if (dealsCount > 0) {
            return Response.json({ error: PROJECT_PARTIES_LOCKED_ERROR }, { status: 400 })
        }
    }

    // Тип сверяем только у новых сторон: контрагент мог сменить роль
    // (конечный потребитель ↔ дистрибьютор) уже после создания проекта, и это
    // не должно блокировать редактирование остальных полей.
    if (data.distributorId && data.distributorId !== existing.distributorId) {
        const d = await prisma.counterparty.findUnique({
            where: { id: data.distributorId },
            select: { type: true },
        })
        if (!d || d.type !== "DISTRIBUTOR") {
            return Response.json({ error: "Дистрибьютор не найден" }, { status: 400 })
        }
    }
    if (data.endCustomerId && data.endCustomerId !== existing.endCustomerId) {
        const c = await prisma.counterparty.findUnique({
            where: { id: data.endCustomerId },
            select: { type: true },
        })
        if (!c || c.type !== "END_CUSTOMER") {
            return Response.json({ error: "Конечный потребитель не найден" }, { status: 400 })
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

    // Дубль проверяем и при редактировании: стороны можно поменять уже после
    // создания, а в «в работе» проект попадает из черновика/апробации — оба
    // пути раньше проходили мимо проверки. Блокируем только чужого
    // дистрибьютора: своему же второй проект на того же потребителя разрешён.
    const nextStatus = data.status ?? existing.status
    const nextDistributorId = data.distributorId ?? existing.distributorId
    const nextEndCustomerId = data.endCustomerId ?? existing.endCustomerId
    const enteringProgress = nextStatus === "IN_PROGRESS" && existing.status !== "IN_PROGRESS"

    if (nextStatus === "IN_PROGRESS" && (partiesChanged || enteringProgress)) {
        const { items: duplicates, hasOtherDistributor } = await findProjectDuplicates(prisma, {
            endCustomerId: nextEndCustomerId,
            distributorId: nextDistributorId,
            excludeId: params.id,
        })

        if (hasOtherDistributor) {
            const other = duplicates.find(isBlockingDuplicate)
            if (body.forceCreate !== true) {
                return Response.json(
                    {
                        error: duplicateProjectMessage(other),
                        requiresComment: true,
                        duplicates,
                    },
                    { status: 409 },
                )
            }
            if (!(data.duplicateComment ?? existing.duplicateComment)) {
                return Response.json(
                    { error: "Укажите комментарий о дубликате" },
                    { status: 400 },
                )
            }
            data.duplicateOfId = other.id
        }
    }

    // Название: пустое собираем из сторон; авто-название при смене стороны
    // пересобираем, чтобы в карточке не остался прежний контрагент. Название,
    // заданное менеджером вручную, не трогаем.
    const nameCleared = data.internalName === null || data.internalName === ""
    const nameKept =
        data.internalName === undefined || data.internalName === existing.internalName

    if (nameCleared || (partiesChanged && nameKept)) {
        const nextDistributorId = data.distributorId ?? existing.distributorId
        const nextEndCustomerId = data.endCustomerId ?? existing.endCustomerId
        const ids = Array.from(
            new Set([
                nextDistributorId,
                nextEndCustomerId,
                existing.distributorId,
                existing.endCustomerId,
            ]),
        )
        const parties = await prisma.counterparty.findMany({
            where: { id: { in: ids } },
            select: { id: true, name: true },
        })
        const nameById = new Map(parties.map(p => [p.id, p.name]))
        const autoName = buildInternalName(
            nameById.get(nextDistributorId),
            nameById.get(nextEndCustomerId),
        )

        if (nameCleared) {
            data.internalName = autoName
        } else if (
            isAutoInternalName(
                existing.internalName,
                nameById.get(existing.distributorId),
                nameById.get(existing.endCustomerId),
            )
        ) {
            data.internalName = autoName
        }
    }

    const { contactIds, ...scalar } = data

    let contactsSet
    if (contactIds !== undefined) {
        const distributorId = scalar.distributorId ?? existing.distributorId
        const endCustomerId = scalar.endCustomerId ?? existing.endCustomerId
        const valid = await prisma.contact.findMany({
            where: {
                id: { in: contactIds },
                counterpartyId: { in: [distributorId, endCustomerId] },
            },
            select: { id: true },
        })
        contactsSet = valid.map(c => ({ id: c.id }))
    }

    const updated = await prisma.$transaction(async tx => {
        const project = await tx.project.update({
            where: { id: params.id },
            data: {
                ...scalar,
                updatedById: session.user.id ?? null,
                contacts: contactsSet !== undefined ? { set: contactsSet } : undefined,
            },
            include: {
                distributor: { select: COUNTERPARTY_SELECT },
                endCustomer: { select: COUNTERPARTY_SELECT },
                manager: { select: MANAGER_SELECT },
                updatedBy: { select: MANAGER_SELECT },
                items: true,
                contacts: { orderBy: [{ lastName: "asc" }, { firstName: "asc" }] },
            },
        })
        const changes = diffEntities(existing, project, PROJECT_TRACKED_FIELDS)
        if (Object.keys(changes).length > 0) {
            await logChange(tx, {
                entityType: "Project",
                entityId: project.id,
                action: "UPDATE",
                payload: changes,
                authorId: session.user.id,
            })
        }
        return project
    })
    return Response.json({ item: updated })
}

export async function DELETE(_request, { params }) {
    const { session, response } = await requireAdmin()
    if (!session) return response

    const existing = await prisma.project.findUnique({ where: { id: params.id } })
    if (!existing) return Response.json({ error: "Не найдено" }, { status: 404 })

    if (!PROJECT_DELETABLE_STATUSES.includes(existing.status)) {
        return Response.json({ error: PROJECT_DELETE_STATUS_ERROR }, { status: 400 })
    }

    const dealsCount = await prisma.deal.count({ where: { sourceProjectId: params.id } })
    if (dealsCount > 0) {
        return Response.json({ error: PROJECT_DELETE_HAS_DEALS_ERROR }, { status: 409 })
    }

    const storageKeys = await prisma.$transaction(async tx => {
        const keys = await deleteEntityTail(tx, "Project", existing.id)
        await deleteOrphanTasks(tx, { projectId: existing.id })
        // Позиции проекта уедут каскадом, контакты — связь m2m, сам контакт
        // живёт у контрагента и остаётся.
        await tx.project.delete({ where: { id: params.id } })
        await logChange(tx, {
            entityType: "Project",
            entityId: existing.id,
            action: "DELETE",
            payload: snapshotEntity(existing, PROJECT_TRACKED_FIELDS),
            authorId: session.user.id,
        })
        return keys
    })

    await removeStoredFiles(storageKeys)
    return Response.json({ ok: true })
}
