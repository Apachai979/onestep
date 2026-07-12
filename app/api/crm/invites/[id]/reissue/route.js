import prisma from "@/lib/client"
import { requireAdmin } from "@/lib/crm/admin"
import { generateToken } from "@/lib/crm/invite"

const CREATED_BY_SELECT = { id: true, firstName: true, lastName: true, email: true }

// Повторно «выслать» приглашение: перевыпускает токен и продлевает срок.
// Годится для истёкших (или ещё активных) приглашений, которыми так и не
// воспользовались. Использованные приглашения перевыпустить нельзя.
export async function POST(request, { params }) {
    const { session, response } = await requireAdmin()
    if (!session) return response

    const invite = await prisma.invite.findUnique({ where: { id: params.id } })
    if (!invite) return Response.json({ error: "Не найдено" }, { status: 404 })
    if (invite.usedAt) {
        return Response.json({ error: "Приглашение уже использовано" }, { status: 400 })
    }

    let ttlDays = 7
    try {
        const body = await request.json()
        if (body?.ttlDays !== undefined) {
            const n = Number(body.ttlDays)
            if (!Number.isInteger(n) || n < 1 || n > 60) {
                return Response.json(
                    { error: "Срок действия от 1 до 60 дней" },
                    { status: 400 },
                )
            }
            ttlDays = n
        }
    } catch {
        // тело необязательно — используем срок по умолчанию
    }

    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000)
    const updated = await prisma.invite.update({
        where: { id: params.id },
        data: { token: generateToken(), expiresAt },
        include: { createdBy: { select: CREATED_BY_SELECT } },
    })
    return Response.json({ item: updated })
}
