export const COUNTERPARTY_TYPES = ["DISTRIBUTOR", "END_CUSTOMER"]

export const COUNTERPARTY_TYPE_LABELS = {
    DISTRIBUTOR: "Дистрибьютор",
    END_CUSTOMER: "Конечный потребитель",
}

export const COUNTERPARTY_SOURCES = [
    "MANAGER_SEARCH",
    "EXHIBITION",
    "EMAIL",
    "WEBSITE_FORM",
    "INCOMING_CALL",
    "OTHER",
]

export const COUNTERPARTY_SOURCE_LABELS = {
    MANAGER_SEARCH: "Собственный поиск МОПа",
    EXHIBITION: "Выставка",
    EMAIL: "Электронная почта",
    WEBSITE_FORM: "Сайт (форма)",
    INCOMING_CALL: "Входящий звонок",
    OTHER: "Другое",
}

// Только для END_CUSTOMER: тип медучреждения.
export const COMPANY_KINDS = ["PUBLIC_MEDICAL", "PRIVATE_MEDICAL"]

export const COMPANY_KIND_LABELS = {
    PUBLIC_MEDICAL: "Государственное медучреждение",
    PRIVATE_MEDICAL: "Частное мед.учреждение",
}

// Только для END_CUSTOMER: профиль/сфера деятельности.
export const ACTIVITY_AREAS = [
    "MULTIDISCIPLINARY_CLINIC",
    "LABORATORY",
    "DIALYSIS_CENTER",
    "HIGH_TECH_MEDICINE",
    "MEDICAL_EDUCATIONAL",
    "POLYCLINIC",
    "MEDICAL_CENTER",
]

// Определить тип медучреждения по коду ОКОПФ из DaData.
// Классификатор ОКОПФ группирует юрлица по первым двум цифрам:
//   65xxx — Унитарные предприятия (ГУП, МУП, ФГУП) — государственные
//   75xxx — Учреждения (ФКУ, ФГБУ, ГБУЗ, МБУ, ГАУ, МАУ...) — государственные
//   12xxx — Хозяйственные общества (ООО, АО, ПАО, ЗАО) — частные
//   50xxx — Индивидуальные предприниматели — частные
// Всё, что не подошло — вернём null, пусть пользователь выберет вручную.
export function guessCompanyKind(opfCode) {
    if (!opfCode) return null
    const s = String(opfCode).trim()
    if (s.startsWith("65") || s.startsWith("75")) return "PUBLIC_MEDICAL"
    if (s.startsWith("12") || s.startsWith("50")) return "PRIVATE_MEDICAL"
    return null
}

export const ACTIVITY_AREA_LABELS = {
    MULTIDISCIPLINARY_CLINIC: "Многопрофильная клиника",
    LABORATORY: "Лаборатория",
    DIALYSIS_CENTER: "Диализный центр",
    HIGH_TECH_MEDICINE: "ВМП",
    MEDICAL_EDUCATIONAL: "Мед.учеб.орг.",
    POLYCLINIC: "Поликлиника",
    MEDICAL_CENTER: "Медицинский центр",
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

const ENUM_FIELDS = [
    { field: "source", values: COUNTERPARTY_SOURCES, label: "Источник" },
    { field: "companyKind", values: COMPANY_KINDS, label: "Тип компании" },
    { field: "activityArea", values: ACTIVITY_AREAS, label: "Сфера деятельности" },
]

const DECIMAL_FIELDS = [
    { field: "totalRevenue", min: 0, label: "Сумма сделок", emptyValue: "0" },
    { field: "discount", min: 0, max: 100, label: "Скидка", emptyValue: null },
]

function parseDecimal(value, { min, max, label, emptyValue = null }) {
    if (value === null || value === undefined || value === "") return { value: emptyValue }
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

    for (const { field, min, max, label, emptyValue } of DECIMAL_FIELDS) {
        if (body[field] === undefined) continue
        const { value, error } = parseDecimal(body[field], { min, max, label, emptyValue })
        if (error) return { error }
        data[field] = value
    }

    for (const { field, values, label } of ENUM_FIELDS) {
        if (body[field] === undefined) continue
        if (body[field] === null || body[field] === "") {
            data[field] = null
            continue
        }
        if (!values.includes(body[field])) {
            return { error: `${label}: недопустимое значение` }
        }
        data[field] = body[field]
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
