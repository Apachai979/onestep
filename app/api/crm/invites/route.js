import prisma from "@/lib/client"
import { requireAdmin } from "@/lib/crm/admin"
import { generateToken, parseInvitePayload } from "@/lib/crm/invite"

const CREATED_BY_SELECT = { id: true, firstName: true, lastName: true, email: true }

export async function GET() {
    const { session, response } = await requireAdmin()
    if (!session) return response

    const items = await prisma.invite.findMany({
        orderBy: { createdAt: "desc" },
        include: { createdBy: { select: CREATED_BY_SELECT } },
    })
    return Response.json({ items })
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

    const { data, error } = parseInvitePayload(body)
    if (error) return Response.json({ error }, { status: 400 })

    if (data.email) {
        const existingUser = await prisma.user.findUnique({ where: { email: data.email } })
        if (existingUser) {
            return Response.json(
                { error: "Пользователь с таким email уже зарегистрирован" },
                { status: 409 },
            )
        }
    }

    const expiresAt = new Date(Date.now() + data.ttlDays * 24 * 60 * 60 * 1000)
    const created = await prisma.invite.create({
        data: {
            token: generateToken(),
            email: data.email,
            role: data.role,
            expiresAt,
            createdById: session.user.id,
        },
        include: { createdBy: { select: CREATED_BY_SELECT } },
    })

    return Response.json({ item: created }, { status: 201 })
}
