import crypto from "crypto"

export const USER_ROLES = ["MANAGER", "ADMIN"]
export const USER_STATUSES = ["ACTIVE", "BLOCKED"]

export const USER_ROLE_LABELS = {
    MANAGER: "Менеджер",
    ADMIN: "Администратор",
}

export const USER_STATUS_LABELS = {
    ACTIVE: "Активен",
    BLOCKED: "Заблокирован",
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function generateToken() {
    return crypto.randomBytes(24).toString("hex")
}

export function parseInvitePayload(body) {
    if (!body || typeof body !== "object") return { error: "Некорректный запрос" }

    const data = { role: "MANAGER", ttlDays: 7 }

    if (body.role !== undefined) {
        if (!USER_ROLES.includes(body.role)) return { error: "Некорректная роль" }
        data.role = body.role
    }

    if (body.email !== undefined && body.email !== null && body.email !== "") {
        if (typeof body.email !== "string") return { error: "Email должен быть строкой" }
        const email = body.email.trim().toLowerCase()
        if (!EMAIL_RE.test(email)) return { error: "Некорректный email" }
        data.email = email
    } else {
        data.email = null
    }

    if (body.ttlDays !== undefined) {
        const n = Number(body.ttlDays)
        if (!Number.isInteger(n) || n < 1 || n > 60) {
            return { error: "Срок действия от 1 до 60 дней" }
        }
        data.ttlDays = n
    }

    return { data }
}

export function inviteStatus(invite, now = new Date()) {
    if (invite.usedAt) return "USED"
    if (new Date(invite.expiresAt) < now) return "EXPIRED"
    return "ACTIVE"
}

export function parseUserUpdatePayload(body) {
    if (!body || typeof body !== "object") return { error: "Некорректный запрос" }
    const data = {}

    const stringFields = ["firstName", "lastName", "phone", "position"]
    for (const f of stringFields) {
        if (body[f] === undefined) continue
        if (body[f] === null || body[f] === "") {
            data[f] = null
            continue
        }
        if (typeof body[f] !== "string") return { error: `Поле ${f} должно быть строкой` }
        data[f] = body[f].trim() || null
    }

    if (body.role !== undefined) {
        if (!USER_ROLES.includes(body.role)) return { error: "Некорректная роль" }
        data.role = body.role
    }

    if (body.status !== undefined) {
        if (!USER_STATUSES.includes(body.status)) return { error: "Некорректный статус" }
        data.status = body.status
    }

    return { data }
}
