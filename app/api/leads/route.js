import prisma from "@/lib/client"
import { CONSENT_TEXT } from "@/lib/consent"

const MAX_FIELD = 500
const MAX_MESSAGE = 5000

function clean(value, max = MAX_FIELD) {
    if (typeof value !== "string") return null
    const trimmed = value.trim().slice(0, max)
    return trimmed || null
}

// Публичный приём заявок с формы обратной связи на сайте.
export async function POST(request) {
    let body
    try {
        body = await request.json()
    } catch {
        return Response.json({ error: "Некорректный JSON" }, { status: 400 })
    }

    const firstName = clean(body.firstName)
    const email = clean(body.email)
    const phone = clean(body.phone)

    if (!firstName) {
        return Response.json({ error: "Укажите имя" }, { status: 400 })
    }
    if (!email && !phone) {
        return Response.json(
            { error: "Укажите e-mail или телефон" },
            { status: 400 },
        )
    }
    // Проверяем согласие на сервере, а не только галочкой в форме: без него
    // обрабатывать данные нельзя, а запрос может прийти в обход интерфейса.
    if (body.consent !== true) {
        return Response.json(
            { error: "Необходимо согласие на обработку персональных данных" },
            { status: 400 },
        )
    }

    const lead = await prisma.lead.create({
        data: {
            firstName,
            lastName: clean(body.lastName),
            email,
            phone,
            company: clean(body.company),
            message: clean(body.message, MAX_MESSAGE),
            consentAt: new Date(),
            consentText: CONSENT_TEXT,
        },
    })

    return Response.json({ ok: true, id: lead.id }, { status: 201 })
}
