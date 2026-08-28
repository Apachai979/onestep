import prisma from "@/lib/client"
import { requireCrmSession } from "@/lib/crm/session"
import { requireAdmin } from "@/lib/crm/admin"
import { logChange } from "@/lib/crm/change-log"
import {
    OWN_COMPANY_SELECT,
    getOwnCompanies,
    setDefaultOwnCompanyId,
} from "@/lib/crm/own-company"

// Справочник наших юрлиц. Читают все менеджеры (значение подставляется в
// сделки), правит только администратор — как и остальные настройки CRM.

export async function GET() {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    return Response.json(await getOwnCompanies())
}

export async function POST(request) {
    const { session, response } = await requireAdmin()
    if (!session) return response

    let body
    try {
        body = await request.json()
    } catch {
        return Response.json({ error: "Некорректный JSON" }, { status: 400 })
    }

    const counterpartyId = body?.counterpartyId
    if (!counterpartyId || typeof counterpartyId !== "string") {
        return Response.json({ error: "Выберите контрагента" }, { status: 400 })
    }

    const item = await prisma.counterparty.findUnique({
        where: { id: counterpartyId },
        select: OWN_COMPANY_SELECT,
    })
    if (!item) return Response.json({ error: "Контрагент не найден" }, { status: 404 })
    if (item.isOwnCompany) {
        return Response.json({ error: "Это юрлицо уже отмечено как наше" }, { status: 409 })
    }

    const { items } = await getOwnCompanies()

    await prisma.$transaction(async tx => {
        await tx.counterparty.update({
            where: { id: item.id },
            data: { isOwnCompany: true },
        })
        await logChange(tx, {
            entityType: "Counterparty",
            entityId: item.id,
            action: "UPDATE",
            payload: { isOwnCompany: { from: false, to: true } },
            authorId: session.user.id,
        })
    })

    // Первое наше юрлицо основным становится само: выбирать не из чего.
    if (items.length === 0) await setDefaultOwnCompanyId(item.id)

    return Response.json(await getOwnCompanies(), { status: 201 })
}
