const STRING_FIELDS = ["sku", "name", "category", "contents"]

const DECIMAL_FIELDS = [
    { field: "basePrice", min: 0, label: "Базовая цена" },
    { field: "packagePrice", min: 0, label: "Цена упаковки" },
    { field: "recommendedLpuPrice", min: 0, label: "Рекомендованная цена ЛПУ" },
]

function parseDecimal(value, { min = 0, label }) {
    if (value === null || value === undefined || value === "") return { value: null }
    const str = String(value).replace(",", ".").trim()
    if (!/^-?\d+(\.\d+)?$/.test(str)) return { error: `${label}: введите число` }
    const num = Number(str)
    if (!Number.isFinite(num)) return { error: `${label}: некорректное число` }
    if (num < min) return { error: `${label}: значение не может быть меньше ${min}` }
    return { value: str }
}

export function parseProductPayload(body, { partial = false } = {}) {
    if (!body || typeof body !== "object") return { error: "Некорректный запрос" }
    const data = {}

    for (const field of STRING_FIELDS) {
        if (body[field] === undefined) continue
        if (body[field] === null || body[field] === "") {
            data[field] = field === "contents" ? null : ""
            continue
        }
        if (typeof body[field] !== "string") {
            return { error: `Поле ${field} должно быть строкой` }
        }
        data[field] = field === "contents" ? body[field] : body[field].trim()
    }

    for (const { field, min, label } of DECIMAL_FIELDS) {
        if (body[field] === undefined) continue
        const { value, error } = parseDecimal(body[field], { min, label })
        if (error) return { error }
        if (field === "recommendedLpuPrice") data[field] = value
        else data[field] = value ?? "0"
    }

    if (body.transportPackQty !== undefined) {
        if (body.transportPackQty === null || body.transportPackQty === "") {
            data.transportPackQty = 0
        } else {
            const n = Number(body.transportPackQty)
            if (!Number.isInteger(n) || n < 0) {
                return { error: "Количество в упаковке должно быть целым числом ≥ 0" }
            }
            data.transportPackQty = n
        }
    }

    if (!partial) {
        if (!data.sku) return { error: "Укажите артикул" }
        if (!data.category) return { error: "Укажите категорию" }
        if (!data.name) data.name = data.category
    } else {
        if ("sku" in data && !data.sku) return { error: "Артикул не может быть пустым" }
        if ("category" in data && !data.category) return { error: "Категория не может быть пустой" }
    }

    return { data }
}

export function contentLines(contents) {
    if (!contents) return []
    return contents
        .split(/\r?\n/)
        .map(s => s.trim())
        .filter(Boolean)
}
