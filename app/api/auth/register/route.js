import bcrypt from "bcryptjs"
import prisma from "@/lib/client"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request) {
    let body
    try {
        body = await request.json()
    } catch {
        return Response.json({ error: "Некорректный запрос" }, { status: 400 })
    }

    const email = typeof body.email === "string" ? body.email.toLowerCase().trim() : ""
    const password = typeof body.password === "string" ? body.password : ""
    const name = typeof body.name === "string" ? body.name.trim() : null

    if (!EMAIL_RE.test(email)) {
        return Response.json({ error: "Введите корректный email" }, { status: 400 })
    }
    if (password.length < 8) {
        return Response.json(
            { error: "Пароль должен содержать минимум 8 символов" },
            { status: 400 },
        )
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
        return Response.json(
            { error: "Пользователь с таким email уже зарегистрирован" },
            { status: 409 },
        )
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
        data: { email, passwordHash, name: name || null },
        select: { id: true, email: true, name: true },
    })

    return Response.json({ user }, { status: 201 })
}
