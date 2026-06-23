const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

const STRING_FIELDS = ["firstName", "lastName", "phone", "email", "position"]

export function parseContactPayload(body, { partial = false } = {}) {
    if (!body || typeof body !== "object") {
        return { error: "Некорректный запрос" }
    }

    const data = {}

    for (const field of STRING_FIELDS) {
        if (body[field] === undefined) continue
        if (body[field] === null || body[field] === "") {
            data[field] = null
            continue
        }
        if (typeof body[field] !== "string") {
            return { error: `Поле ${field} должно быть строкой` }
        }
        data[field] = body[field].trim()
    }

    if (body.birthDate !== undefined) {
        if (body.birthDate === null || body.birthDate === "") {
            data.birthDate = null
        } else if (typeof body.birthDate !== "string" || !DATE_RE.test(body.birthDate)) {
            return { error: "Дата рождения должна быть в формате ГГГГ-ММ-ДД" }
        } else {
            const d = new Date(`${body.birthDate}T00:00:00.000Z`)
            if (Number.isNaN(d.getTime())) {
                return { error: "Некорректная дата рождения" }
            }
            data.birthDate = d
        }
    }

    if (body.isPrimary !== undefined) {
        data.isPrimary = !!body.isPrimary
    }

    if (data.email) {
        if (!EMAIL_RE.test(data.email)) return { error: "Некорректный email" }
    }

    if (!partial) {
        const hasAny =
            data.firstName || data.lastName || data.phone || data.email || data.position
        if (!hasAny) {
            return { error: "Заполните хотя бы одно поле: имя, фамилия, телефон или email" }
        }
    }

    return { data }
}
