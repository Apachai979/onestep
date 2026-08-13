// Профиль сотрудника: то, что он правит себе сам на /crm/profile.
// Роль, статус и email сюда намеренно не входят — их меняет только админ.

import { parsePrefs } from "./prefs"

// Поля, которые пользователь может изменить в своей карточке.
export const PROFILE_FIELDS = ["firstName", "lastName", "phone", "position", "telegram"]

// Что отдаём клиенту. telegramChatId наружу не выпускаем — это внутренний
// идентификатор привязки к боту.
export const PROFILE_SELECT = {
    id: true,
    email: true,
    firstName: true,
    lastName: true,
    phone: true,
    position: true,
    telegram: true,
    role: true,
    status: true,
    prefs: true,
}

// Наружу prefs идут объектом: в базе это JSON-строка, но форме удобнее объект
// с проставленными значениями по умолчанию.
export function toProfileDto(user) {
    return { ...user, prefs: parsePrefs(user.prefs) }
}

const TELEGRAM_RE = /^[a-zA-Z0-9_]{5,32}$/

// Приводим к виду «@username»: принимаем t.me/user, https://t.me/user, @user, user.
export function normalizeTelegram(raw) {
    const value = raw.trim().replace(/^https?:\/\//i, "").replace(/^t\.me\//i, "")
    const handle = value.replace(/^@/, "")
    if (!TELEGRAM_RE.test(handle)) {
        return { error: "Телеграм: 5–32 символа, латиница, цифры и _" }
    }
    return { value: `@${handle}` }
}

export function parseProfilePayload(body) {
    if (!body || typeof body !== "object") return { error: "Некорректный запрос" }
    const data = {}

    for (const f of PROFILE_FIELDS) {
        if (body[f] === undefined) continue
        if (body[f] === null || body[f] === "") {
            data[f] = null
            continue
        }
        if (typeof body[f] !== "string") return { error: `Поле ${f} должно быть строкой` }
        const trimmed = body[f].trim()
        if (!trimmed) {
            data[f] = null
            continue
        }
        if (f === "telegram") {
            const { value, error } = normalizeTelegram(trimmed)
            if (error) return { error }
            data[f] = value
            continue
        }
        data[f] = trimmed
    }

    return { data }
}

// Имя для сайдбара и подписей — та же логика, что в configs/auth.ts.
export function displayName(user) {
    const composed = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim()
    return composed || user.email
}
