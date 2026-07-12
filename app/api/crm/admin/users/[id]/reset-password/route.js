import bcrypt from "bcryptjs"
import prisma from "@/lib/client"
import { requireAdmin } from "@/lib/crm/admin"

export async function POST(request, { params }) {
    const { session, response } = await requireAdmin()
    if (!session) return response

    const user = await prisma.user.findUnique({ where: { id: params.id } })
    if (!user) return Response.json({ error: "Не найдено" }, { status: 404 })

    let body
    try {
        body = await request.json()
    } catch {
        return Response.json({ error: "Некорректный JSON" }, { status: 400 })
    }

    const password = typeof body?.password === "string" ? body.password : ""
    if (password.length < 8) {
        return Response.json(
            { error: "Пароль должен содержать минимум 8 символов" },
            { status: 400 },
        )
    }

    const passwordHash = await bcrypt.hash(password, 10)
    await prisma.user.update({ where: { id: params.id }, data: { passwordHash } })
    return Response.json({ ok: true })
}
