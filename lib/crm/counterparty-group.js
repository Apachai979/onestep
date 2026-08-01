// Группа компаний: несколько юрлиц одного клиента. Скидка и суммарный бюджет
// считаются по группе, поэтому «зайти» другим юрлицом за лучшими условиями
// не получится.

const NAME_MAX = 200

function parseDiscount(value) {
    if (value === null || value === undefined || value === "") return { value: null }
    const str = String(value).replace(",", ".").trim()
    if (!/^\d+(\.\d+)?$/.test(str)) return { error: "Скидка: введите число" }
    const num = Number(str)
    if (!Number.isFinite(num)) return { error: "Скидка: некорректное число" }
    if (num < 0) return { error: "Скидка: значение не может быть меньше 0" }
    if (num > 100) return { error: "Скидка: значение не может быть больше 100" }
    return { value: str }
}

export function parseGroupPayload(body, { partial = false } = {}) {
    if (!body || typeof body !== "object") return { error: "Некорректный запрос" }

    const data = {}

    if (!partial || body.name !== undefined) {
        if (typeof body.name !== "string" || !body.name.trim()) {
            return { error: "Укажите название группы" }
        }
        const name = body.name.trim()
        if (name.length > NAME_MAX) return { error: "Слишком длинное название группы" }
        data.name = name
    }

    if (body.discount !== undefined) {
        const { value, error } = parseDiscount(body.discount)
        if (error) return { error }
        data.discount = value
    }

    if (body.note !== undefined) {
        if (body.note === null || body.note === "") data.note = null
        else if (typeof body.note !== "string") return { error: "Примечание должно быть строкой" }
        else data.note = body.note.trim()
    }

    return { data }
}

// Скидка группы приоритетнее личной скидки юрлица: иначе клиент выторгует
// условия, просто выбрав для сделки другое своё юрлицо.
export function effectiveDiscount(counterparty) {
    const groupDiscount = counterparty?.group?.discount
    if (groupDiscount !== null && groupDiscount !== undefined && groupDiscount !== "") {
        return groupDiscount
    }
    return counterparty?.discount ?? null
}

export function isDiscountFromGroup(counterparty) {
    const groupDiscount = counterparty?.group?.discount
    return groupDiscount !== null && groupDiscount !== undefined && groupDiscount !== ""
}

// Суммарный бюджет группы: totalRevenue заполняют вручную и импортом, поэтому
// просто складываем значения участников.
export function groupTotalRevenue(members) {
    return (members || []).reduce((acc, m) => acc + Number(m.totalRevenue || 0), 0)
}

// Оборот группы — сумма закрытых сделок всех её юрлиц. Поле closedRevenue
// участникам проставляет сервер (см. attachClosedRevenue в lib/crm/revenue.js),
// здесь только складываем.
export function groupClosedRevenue(members) {
    return (members || []).reduce((acc, m) => acc + Number(m.closedRevenue || 0), 0)
}

export function memberLabel(member) {
    if (!member) return ""
    return member.inn ? `${member.name} · ИНН ${member.inn}` : member.name
}
