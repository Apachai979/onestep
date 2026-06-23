export const COUNTERPARTY_TYPES = ["DISTRIBUTOR", "END_CUSTOMER"]

export const COUNTERPARTY_TYPE_LABELS = {
    DISTRIBUTOR: "Дистрибьютор",
    END_CUSTOMER: "Конечный потребитель",
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const STRING_FIELDS = [
    "name",
    "region",
    "inn",
    "kpp",
    "ogrn",
    "okpo",
    "okved",
    "bankName",
    "bankAccount",
    "bankCorrAccount",
    "bik",
    "phone",
    "email",
    "address",
    "note",
]

const DECIMAL_FIELDS = [
    { field: "totalRevenue", min: 0, label: "Сумма сделок" },
    { field: "discount", min: 0, max: 100, label: "Скидка" },
]

function parseDecimal(value, { min, max, label }) {
    if (value === null || value === undefined || value === "") return { value: null }
    const str = String(value).replace(",", ".").trim()
    if (!/^-?\d+(\.\d+)?$/.test(str)) {
        return { error: `${label}: введите число` }
    }
    const num = Number(str)
    if (!Number.isFinite(num)) return { error: `${label}: некорректное число` }
    if (min !== undefined && num < min) return { error: `${label}: значение не может быть меньше ${min}` }
    if (max !== undefined && num > max) return { error: `${label}: значение не может быть больше ${max}` }
    return { value: str }
}

export function parseCounterpartyPayload(body, { partial = false } = {}) {
    if (!body || typeof body !== "object") {
        return { error: "Некорректный запрос" }
    }

    const data = {}

    if (!partial || body.type !== undefined) {
        if (!COUNTERPARTY_TYPES.includes(body.type)) {
            return { error: "Некорректный тип контрагента" }
        }
        data.type = body.type
    }

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

    for (const { field, min, max, label } of DECIMAL_FIELDS) {
        if (body[field] === undefined) continue
        const { value, error } = parseDecimal(body[field], { min, max, label })
        if (error) return { error }
        data[field] = value
    }

    if (!partial) {
        if (!data.name) return { error: "Укажите название" }
        if (!data.region) return { error: "Укажите регион" }
    } else {
        if ("name" in data && !data.name) return { error: "Название не может быть пустым" }
        if ("region" in data && !data.region) return { error: "Регион не может быть пустым" }
    }

    if (data.email) {
        if (!EMAIL_RE.test(data.email)) return { error: "Некорректный email" }
    }

    return { data }
}
