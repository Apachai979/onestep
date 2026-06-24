import bcrypt from "bcryptjs"
import prisma from "@/lib/client"
import { inviteStatus } from "@/lib/crm/invite"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request) {
    let body
    try {
        body = await request.json()
    } catch {
        return Response.json({ error: "Некорректный запрос" }, { status: 400 })
    }

    const token = typeof body.token === "string" ? body.token.trim() : ""
    if (!token) {
        return Response.json(
            { error: "Регистрация возможна только по приглашению" },
            { status: 403 },
        )
    }

    const invite = await prisma.invite.findUnique({ where: { token } })
    if (!invite) return Response.json({ error: "Приглашение не найдено" }, { status: 404 })

    const status = inviteStatus(invite)
    if (status !== "ACTIVE") {
        return Response.json(
            {
                error:
                    status === "USED"
                        ? "Приглашение уже использовано"
                        : "Срок действия приглашения истёк",
            },
            { status: 410 },
        )
    }

    const email =
        typeof body.email === "string"
            ? body.email.toLowerCase().trim()
            : invite.email || ""
    const password = typeof body.password === "string" ? body.password : ""
    const firstName = typeof body.firstName === "string" ? body.firstName.trim() : null
    const lastName = typeof body.lastName === "string" ? body.lastName.trim() : null

    if (!EMAIL_RE.test(email)) {
        return Response.json({ error: "Введите корректный email" }, { status: 400 })
    }
    if (invite.email && email !== invite.email) {
        return Response.json(
            { error: "Email должен совпадать с указанным в приглашении" },
            { status: 400 },
        )
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
    const user = await prisma.$transaction(async tx => {
        const created = await tx.user.create({
            data: {
                email,
                passwordHash,
                firstName: firstName || null,
                lastName: lastName || null,
                role: invite.role,
                status: "ACTIVE",
            },
            select: { id: true, email: true, firstName: true, lastName: true, role: true },
        })
        await tx.invite.update({
            where: { id: invite.id },
            data: { usedAt: new Date(), usedByEmail: email },
        })
        return created
    })

    return Response.json({ user }, { status: 201 })
}
