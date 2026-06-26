const ONES_M = [
    "",
    "один",
    "два",
    "три",
    "четыре",
    "пять",
    "шесть",
    "семь",
    "восемь",
    "девять",
]
const ONES_F = [
    "",
    "одна",
    "две",
    "три",
    "четыре",
    "пять",
    "шесть",
    "семь",
    "восемь",
    "девять",
]
const TEENS = [
    "десять",
    "одиннадцать",
    "двенадцать",
    "тринадцать",
    "четырнадцать",
    "пятнадцать",
    "шестнадцать",
    "семнадцать",
    "восемнадцать",
    "девятнадцать",
]
const TENS = [
    "",
    "",
    "двадцать",
    "тридцать",
    "сорок",
    "пятьдесят",
    "шестьдесят",
    "семьдесят",
    "восемьдесят",
    "девяносто",
]
const HUNDREDS = [
    "",
    "сто",
    "двести",
    "триста",
    "четыреста",
    "пятьсот",
    "шестьсот",
    "семьсот",
    "восемьсот",
    "девятьсот",
]

function group(n, female) {
    const ones = female ? ONES_F : ONES_M
    const parts = []
    const h = Math.floor(n / 100)
    const t = Math.floor((n % 100) / 10)
    const u = n % 10
    if (h) parts.push(HUNDREDS[h])
    if (t === 1) {
        parts.push(TEENS[u])
    } else {
        if (t) parts.push(TENS[t])
        if (u) parts.push(ones[u])
    }
    return parts.join(" ")
}

function declension(n, forms) {
    const abs = Math.abs(n) % 100
    const n1 = abs % 10
    if (abs > 10 && abs < 20) return forms[2]
    if (n1 > 1 && n1 < 5) return forms[1]
    if (n1 === 1) return forms[0]
    return forms[2]
}

export function rublesToWords(amount) {
    const value = Number(amount) || 0
    const integer = Math.floor(value)
    const fraction = Math.round((value - integer) * 100)

    const billions = Math.floor(integer / 1e9)
    const millions = Math.floor((integer % 1e9) / 1e6)
    const thousands = Math.floor((integer % 1e6) / 1e3)
    const units = integer % 1000

    const parts = []

    if (billions) {
        parts.push(group(billions, false))
        parts.push(declension(billions, ["миллиард", "миллиарда", "миллиардов"]))
    }
    if (millions) {
        parts.push(group(millions, false))
        parts.push(declension(millions, ["миллион", "миллиона", "миллионов"]))
    }
    if (thousands) {
        parts.push(group(thousands, true))
        parts.push(declension(thousands, ["тысяча", "тысячи", "тысяч"]))
    }
    if (units || (!billions && !millions && !thousands)) {
        parts.push(units ? group(units, false) : "ноль")
    }
    parts.push(declension(integer || 0, ["рубль", "рубля", "рублей"]))

    if (fraction === 0) {
        parts.push("ноль")
    } else {
        parts.push(String(fraction).padStart(2, "0"))
    }
    parts.push(declension(fraction, ["копейка", "копейки", "копеек"]))

    const result = parts.filter(Boolean).join(" ")
    return result.charAt(0).toUpperCase() + result.slice(1)
}
