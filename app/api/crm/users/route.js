import prisma from "@/lib/client"
import { requireCrmSession } from "@/lib/crm/session"

export async function GET() {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    const items = await prisma.user.findMany({
        where: { status: "ACTIVE", role: { in: ["MANAGER", "ADMIN"] } },
        select: { id: true, firstName: true, lastName: true, email: true, role: true },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    })
    return Response.json({ items })
}
