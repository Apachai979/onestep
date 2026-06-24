import prisma from "@/lib/client"
import { requireAdmin } from "@/lib/crm/admin"

export async function GET() {
    const { session, response } = await requireAdmin()
    if (!session) return response

    const items = await prisma.user.findMany({
        select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            position: true,
            role: true,
            status: true,
            createdAt: true,
        },
        orderBy: [{ status: "asc" }, { lastName: "asc" }, { firstName: "asc" }],
    })
    return Response.json({ items })
}
