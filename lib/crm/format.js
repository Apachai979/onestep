const RUB = new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 2,
})

const NUM = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 })

function toNumber(value) {
    if (value === null || value === undefined || value === "") return null
    const n = Number(value)
    return Number.isFinite(n) ? n : null
}

export function formatMoney(value) {
    const n = toNumber(value)
    if (n === null) return "—"
    return RUB.format(n)
}

export function formatPercent(value) {
    const n = toNumber(value)
    if (n === null) return "—"
    return `${NUM.format(n)} %`
}
