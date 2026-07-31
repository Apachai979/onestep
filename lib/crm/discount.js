import { effectiveDiscount } from "./counterparty-group"

/**
 * Скидка наследуется по цепочке: контрагент (или его группа) → проект →
 * сделка → КП. Каждое звено получает значение предыдущего как значение по
 * умолчанию **в момент создания** и дальше хранит свою копию: скидку в
 * карточке контрагента могут пересмотреть, но старые проекты, сделки и уже
 * выставленные КП от этого не пересчитываются. Переопределить скидку менеджер
 * может на любом звене.
 *
 * Здесь — только «откуда взять значение по умолчанию». Хелперы возвращают не
 * голое число, а источник: форма подписывает им поле («из карточки клиента»,
 * «из проекта»), чтобы менеджер понимал, что именно он меняет.
 */

export const DISCOUNT_SOURCE_LABELS = {
    group: "из группы компаний",
    counterparty: "из карточки клиента",
    project: "из проекта",
}

// Decimal из Prisma, строка из формы, число — приводим к строке; пусто → null.
function normalize(value) {
    if (value === null || value === undefined || value === "") return null
    return String(value)
}

/**
 * Скидка контрагента с учётом группы. Ждёт объект с полем discount и,
 * желательно, включённой связью group: { discount, name }.
 */
export function counterpartyDiscountInfo(counterparty) {
    if (!counterparty) return { value: null, source: null, groupName: null }
    const value = normalize(effectiveDiscount(counterparty))
    if (value === null) return { value: null, source: null, groupName: null }
    const fromGroup =
        counterparty.group?.discount !== null &&
        counterparty.group?.discount !== undefined &&
        counterparty.group?.discount !== ""
    return {
        value,
        source: fromGroup ? "group" : "counterparty",
        groupName: fromGroup ? (counterparty.group?.name ?? null) : null,
    }
}

/**
 * Скидка, которую наследует сделка: своя скидка проекта, иначе — скидка
 * клиента (или его группы). project можно не передавать — сделка без
 * проекта-источника берёт скидку прямо у клиента.
 */
export function inheritedDealDiscount(project, counterparty) {
    const own = normalize(project?.discount)
    if (own !== null) return { value: own, source: "project", groupName: null }
    return counterpartyDiscountInfo(counterparty)
}

// «7% — из карточки клиента». Для группы дописываем её название.
export function discountSourceLabel(info) {
    if (!info?.source) return null
    const base = DISCOUNT_SOURCE_LABELS[info.source]
    if (info.source === "group" && info.groupName) return `${base} «${info.groupName}»`
    return base
}

// «7 %» без хвостовых нулей — скидки задают как 7, 7.5, 12.25.
export function formatDiscount(value) {
    const v = normalize(value)
    if (v === null) return null
    const num = Number(v)
    if (!Number.isFinite(num)) return null
    return `${Number(num.toFixed(2))} %`
}
