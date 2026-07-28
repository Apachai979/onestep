import prisma from "@/lib/client"
import { requireCrmSession } from "@/lib/crm/session"
import { PROFILE_SELECT, displayName, parseProfilePayload } from "@/lib/crm/profile"

export async function GET() {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    const item = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: PROFILE_SELECT,
    })
    if (!item) return Response.json({ error: "Не найдено" }, { status: 404 })
    return Response.json({ item })
}

export async function PATCH(request) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    let body
    try {
        body = await request.json()
    } catch {
        return Response.json({ error: "Некорректный JSON" }, { status: 400 })
    }

    const { data, error } = parseProfilePayload(body)
    if (error) return Response.json({ error }, { status: 400 })

    // Пишем всегда в свою запись: id берём из сессии, а не из тела запроса.
    const item = await prisma.user.update({
        where: { id: session.user.id },
        data,
        select: PROFILE_SELECT,
    })

    return Response.json({ item, name: displayName(item) })
}
