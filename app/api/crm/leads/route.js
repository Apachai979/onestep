import prisma from "@/lib/client"
import { requireCrmSession } from "@/lib/crm/session"

export async function GET(request) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")

    const where = {}
    if (status === "NEW" || status === "PROCESSED") where.status = status

    const items = await prisma.lead.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 200,
    })

    return Response.json({ items })
}
