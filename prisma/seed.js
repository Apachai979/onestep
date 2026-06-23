const { PrismaClient } = require("@prisma/client")
const bcrypt = require("bcryptjs")

const prisma = new PrismaClient()

async function main() {
    const email = (process.env.BOOTSTRAP_ADMIN_EMAIL || "").toLowerCase().trim()
    const password = process.env.BOOTSTRAP_ADMIN_PASSWORD || ""
    const firstName = process.env.BOOTSTRAP_ADMIN_FIRST_NAME || null
    const lastName = process.env.BOOTSTRAP_ADMIN_LAST_NAME || null

    if (!email || !password) {
        console.warn(
            "[seed] BOOTSTRAP_ADMIN_EMAIL и BOOTSTRAP_ADMIN_PASSWORD не заданы — админ не создан.",
        )
        return
    }
    if (password.length < 8) {
        throw new Error("[seed] BOOTSTRAP_ADMIN_PASSWORD должен быть не короче 8 символов")
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
        if (existing.role !== "ADMIN" || existing.status !== "ACTIVE") {
            await prisma.user.update({
                where: { email },
                data: { role: "ADMIN", status: "ACTIVE" },
            })
            console.log(`[seed] Пользователь ${email} повышен до ADMIN и активирован.`)
        } else {
            console.log(`[seed] Админ ${email} уже существует — пропускаю.`)
        }
        return
    }

    const passwordHash = await bcrypt.hash(password, 10)
    await prisma.user.create({
        data: {
            email,
            passwordHash,
            firstName,
            lastName,
            role: "ADMIN",
            status: "ACTIVE",
        },
    })
    console.log(`[seed] Создан ADMIN: ${email}`)
}

main()
    .catch(err => {
        console.error(err)
        process.exit(1)
    })
    .finally(() => prisma.$disconnect())
