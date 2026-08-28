import prisma from "@/lib/client"
import { requireAdmin } from "@/lib/crm/admin"
import { logChange } from "@/lib/crm/change-log"
import {
    OWN_COMPANY_SELECT,
    getOwnCompanies,
    setDefaultOwnCompanyId,
} from "@/lib/crm/own-company"

// PATCH { isDefault: true } — сделать это юрлицо основным (подставляется в сделки).
export async function PATCH(request, { params }) {
    const { session, response } = await requireAdmin()
    if (!session) return response

    let body
    try {
        body = await request.json()
    } catch {
        return Response.json({ error: "Некорректный JSON" }, { status: 400 })
    }

    const item = await prisma.counterparty.findUnique({
        where: { id: params.id },
        select: OWN_COMPANY_SELECT,
    })
    if (!item || !item.isOwnCompany) {
        return Response.json({ error: "Это юрлицо не отмечено как наше" }, { status: 404 })
    }

    if (body?.isDefault === true) {
        await setDefaultOwnCompanyId(item.id)
    } else if (body?.isDefault === false) {
        await setDefaultOwnCompanyId(null)
    } else {
        return Response.json({ error: "Нечего менять" }, { status: 400 })
    }

    return Response.json(await getOwnCompanies())
}

// DELETE — снять пометку «наше юрлицо». Карточку контрагента не трогаем: она
// остаётся в своём списке со всей историей сделок.
export async function DELETE(request, { params }) {
    const { session, response } = await requireAdmin()
    if (!session) return response

    const item = await prisma.counterparty.findUnique({
        where: { id: params.id },
        select: OWN_COMPANY_SELECT,
    })
    if (!item || !item.isOwnCompany) {
        return Response.json({ error: "Это юрлицо не отмечено как наше" }, { status: 404 })
    }

    const before = await getOwnCompanies()

    await prisma.$transaction(async tx => {
        await tx.counterparty.update({
            where: { id: item.id },
            data: { isOwnCompany: false },
        })
        await logChange(tx, {
            entityType: "Counterparty",
            entityId: item.id,
            action: "UPDATE",
            payload: { isOwnCompany: { from: true, to: false } },
            authorId: session.user.id,
        })
    })

    // Убрали основную — CRM остаётся без значения по умолчанию. Выбирать за
    // администратора не станем, кроме случая, когда юрлицо осталось одно.
    if (before.defaultId === item.id) {
        const rest = before.items.filter(i => i.id !== item.id)
        await setDefaultOwnCompanyId(rest.length === 1 ? rest[0].id : null)
    }

    return Response.json(await getOwnCompanies())
}
