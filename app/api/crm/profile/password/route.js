import bcrypt from "bcryptjs"
import prisma from "@/lib/client"
import { requireCrmSession } from "@/lib/crm/session"
import { validatePassword } from "@/lib/crm/password"

// Смена собственного пароля. Меняем всегда запись из сессии — id из тела
// запроса не читаем, чтобы менеджер не мог перебить пароль коллеге.
export async function POST(request) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    let body
    try {
        body = await request.json()
    } catch {
        return Response.json({ error: "Некорректный JSON" }, { status: 400 })
    }

    const currentPassword =
        typeof body?.currentPassword === "string" ? body.currentPassword : ""
    const { value: newPassword, error } = validatePassword(body?.newPassword)
    if (error) return Response.json({ error }, { status: 400 })

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { id: true, passwordHash: true },
    })
    if (!user) return Response.json({ error: "Не найдено" }, { status: 404 })

    // Текущий пароль обязателен: иначе чужая открытая вкладка = захват учётки.
    const valid = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!valid) {
        return Response.json({ error: "Текущий пароль указан неверно" }, { status: 400 })
    }

    if (await bcrypt.compare(newPassword, user.passwordHash)) {
        return Response.json(
            { error: "Новый пароль совпадает с текущим" },
            { status: 400 },
        )
    }

    const passwordHash = await bcrypt.hash(newPassword, 10)
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } })

    return Response.json({ ok: true })
}
