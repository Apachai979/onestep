const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

const STRING_FIELDS = ["firstName", "lastName", "phone", "workPhone", "email", "position"]

// Приводит российский сотовый номер к формату +79999999999.
// Не похожие на российский мобильный значения возвращаются как есть.
export function normalizeMobilePhone(raw) {
    const str = String(raw).trim()
    const digits = str.replace(/\D/g, "")
    if (digits.length === 11 && (digits[0] === "7" || digits[0] === "8")) {
        return `+7${digits.slice(1)}`
    }
    if (digits.length === 10 && digits[0] === "9") {
        return `+7${digits}`
    }
    return str
}

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

    if (data.phone) {
        data.phone = normalizeMobilePhone(data.phone)
    }

    if (data.email) {
        if (!EMAIL_RE.test(data.email)) return { error: "Некорректный email" }
    }

    if (!partial) {
        const hasAny = data.firstName || data.lastName || data.phone || data.email || data.position
        if (!hasAny) {
            return { error: "Заполните хотя бы одно поле: имя, фамилия, телефон или email" }
        }
    }

    return { data }
}
