import prisma from "@/lib/client"
import { requireCrmSession } from "@/lib/crm/session"

export async function GET() {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    const now = new Date()
    const startOfTomorrow = new Date(now)
    startOfTomorrow.setUTCHours(0, 0, 0, 0)
    startOfTomorrow.setUTCDate(startOfTomorrow.getUTCDate() + 1)

    const [mineOpen, mineOverdue, mineToday] = await Promise.all([
        prisma.task.count({
            where: { assigneeId: session.user.id, status: "OPEN" },
        }),
        prisma.task.count({
            where: { assigneeId: session.user.id, status: "OPEN", endAt: { lt: now } },
        }),
        prisma.task.count({
            where: {
                assigneeId: session.user.id,
                status: "OPEN",
                startAt: { lt: startOfTomorrow },
                endAt: { gte: now },
            },
        }),
    ])

    return Response.json({ mineOpen, mineOverdue, mineToday })
}
