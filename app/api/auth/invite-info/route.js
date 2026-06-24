import prisma from "@/lib/client"
import { inviteStatus, USER_ROLE_LABELS } from "@/lib/crm/invite"

export async function GET(request) {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get("token")?.trim()
    if (!token) return Response.json({ error: "Токен не задан" }, { status: 400 })

    const invite = await prisma.invite.findUnique({ where: { token } })
    if (!invite) return Response.json({ error: "Приглашение не найдено" }, { status: 404 })

    const status = inviteStatus(invite)
    return Response.json({
        item: {
            email: invite.email,
            role: invite.role,
            roleLabel: USER_ROLE_LABELS[invite.role] || invite.role,
            status,
            expiresAt: invite.expiresAt,
        },
    })
}
