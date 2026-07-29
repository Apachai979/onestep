import prisma from "@/lib/client"
import { requireCrmSession } from "@/lib/crm/session"
import { crmDayEnd, crmToday } from "@/lib/crm/datetime"

export async function GET() {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    // Сутки — московские, как и везде в CRM: сервер может стоять в другой зоне.
    const now = new Date()
    const dayEnd = crmDayEnd(crmToday())

    const [mineOpen, mineOverdue, mineToday] = await Promise.all([
        prisma.task.count({
            where: { assigneeId: session.user.id, status: "OPEN" },
        }),
        prisma.task.count({
            where: { assigneeId: session.user.id, status: "OPEN", endAt: { lt: now } },
        }),
        // На сегодня и ещё не просрочено: интервал задачи пересекает текущие сутки.
        prisma.task.count({
            where: {
                assigneeId: session.user.id,
                status: "OPEN",
                startAt: { lte: dayEnd },
                endAt: { gte: now },
            },
        }),
    ])

    return Response.json({ mineOpen, mineOverdue, mineToday })
}
