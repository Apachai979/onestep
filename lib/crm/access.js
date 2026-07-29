// Правила «замороженных» карточек.
//
// Менеджер не редактирует проект, который проработан без потребности, и
// сделку в завершённом статусе — у таких карточек остаётся только панель
// активности (заметки, задачи, файлы, история). Администратору доступно всё.

// «Проработано, нет потребности»
export const PROJECT_LOCKED_STATUSES = ["NO_NEED"]

// «Закрыто», «Не реализована» и ARCHIVED — сделки уезжают туда из
// CLOSED/CANCELLED автоматически (см. autoArchiveStaleFinalDeals), поэтому
// архив закрыт тоже, иначе блокировка обходится ожиданием.
export const DEAL_LOCKED_STATUSES = ["CLOSED", "CANCELLED", "ARCHIVED"]

export const PROJECT_LOCKED_ERROR =
    "Проект в статусе «Проработано, нет потребности» — изменения доступны только администратору"

export const DEAL_LOCKED_ERROR =
    "Сделка в завершённом статусе — изменения доступны только администратору"

// «Не реализована» и «Архив». CLOSED сюда не входит намеренно: исполненная
// сделка — это история отгрузок и денег, её удаляют только через возврат в
// CANCELLED, то есть осознанно.
export const DEAL_DELETABLE_STATUSES = ["CANCELLED", "ARCHIVED"]

export const DEAL_DELETE_STATUS_ERROR =
    "Удалить можно только сделку в статусе «Не реализована» или «Архив»"

// Удаление карточки — операция администратора и только для «мёртвых» проектов:
// в «Проработано, нет потребности» проект уже никуда не движется, а всё
// остальное (черновик, апробация, работа) удалять нельзя даже админу — для
// этого есть смена статуса.
export const PROJECT_DELETABLE_STATUSES = ["NO_NEED"]

export const PROJECT_DELETE_STATUS_ERROR =
    "Удалить можно только проект в статусе «Проработано, нет потребности»"

// Проект — источник сделки, снос проекта под живой сделкой оставил бы её без
// контекста. Требуем сначала разобраться со сделками.
// Сделки в «Не реализована» на карточке проекта скрыты, поэтому упоминаем их
// отдельно — иначе отказ выглядит беспричинным.
export const PROJECT_DELETE_HAS_DEALS_ERROR =
    "По проекту есть сделки (в том числе «Не реализована», они на карточке не показаны) — " +
    "сначала удалите их или отвяжите от проекта"

// Если по проекту уже создана сделка, стороны проекта фиксируются: сделка
// заведена именно на этих контрагентов, подмена сломала бы связку.
export const PROJECT_PARTIES_LOCKED_ERROR =
    "По проекту уже создана сделка — конечного потребителя и дистрибьютора изменить нельзя"

// Обратная сторона того же правила: у сделки, заведённой из проекта, клиент и
// заказчик приходят из проекта и не редактируются. Сама привязка к проекту тоже
// зафиксирована — иначе запрет обходится отвязкой и повторной привязкой.
export const DEAL_PARTIES_LOCKED_ERROR =
    "Сделка создана из проекта — клиента, заказчика и привязку к проекту изменить нельзя"

// Стороны сделки, привязанной к проекту, выводятся из него: клиент — это
// дистрибьютор проекта, заказчик аукциона — его конечный потребитель.
// Возвращает текст ошибки или null. project — { distributorId, endCustomerId }.
export function dealProjectPartiesError(project, { counterpartyId, auctionCustomerId }) {
    if (!project) return "Проект-источник не найден"
    if (counterpartyId && counterpartyId !== project.distributorId) {
        return "Клиент сделки должен совпадать с дистрибьютором проекта-источника"
    }
    if (auctionCustomerId && auctionCustomerId !== project.endCustomerId) {
        return "Заказчик должен совпадать с конечным потребителем проекта-источника"
    }
    return null
}

// Проведённая отгрузка фиксирует состав заказа. Позицию, попавшую в отгрузку
// со статусом SHIPPED, нельзя ни править, ни удалять по трём причинам:
//  1. ShipmentItem каскадится по dealItemId — удаление позиции молча вырезало бы
//     строку из уже проведённого документа;
//  2. calculateDealShipmentProgress выводит цену единицы из самой позиции
//     (amount / quantity) и умножает на скидку сделки, поэтому правка суммы или
//     скидки переписывает «отгружено на N ₽» задним числом;
//  3. количество меньше отгруженного даёт заведомо неверный остаток.
// Исключения для админа здесь нет — это целостность исторических документов, а
// не полномочия. Штатный путь: вернуть отгрузку в черновик, поправить, провести.
export const DEAL_ITEM_SHIPPED_ERROR =
    "Позиция вошла в проведённую отгрузку — изменить или удалить её нельзя. " +
    "Верните отгрузку в черновик, если правка действительно нужна."

export const DEAL_DISCOUNT_SHIPPED_ERROR =
    "По сделке есть проведённая отгрузка — скидку изменить нельзя: " +
    "пересчитались бы суммы уже отгруженного"

export function dealItemShippedError(shipmentNumbers) {
    const list = (shipmentNumbers || []).filter(Boolean)
    if (list.length === 0) return DEAL_ITEM_SHIPPED_ERROR
    return `Позиция вошла в проведённую отгрузку ${list.join(", ")} — изменить или удалить её нельзя. Верните отгрузку в черновик, если правка действительно нужна.`
}

export function dealItemReservedError(reservedQty, shipmentNumbers) {
    const list = (shipmentNumbers || []).filter(Boolean)
    const where = list.length > 0 ? ` (${list.join(", ")})` : ""
    return `В отгрузках уже распределено ${reservedQty} — количество нельзя опустить ниже${where}`
}

function toQty(v) {
    if (v === null || v === undefined) return 0
    const s = typeof v === "object" && v.toString ? v.toString() : String(v)
    const n = Number(s.replace(",", "."))
    return Number.isFinite(n) ? n : 0
}

/**
 * Где позиция сделки уже задействована в отгрузках.
 * shipments — Shipment[] с { number, status, items: { dealItemId, quantity } }.
 *
 * Возвращает { isShipped, shippedQty, shippedIn, draftQty, draftIn }:
 * *Qty — количество, *In — номера документов. Черновики считаются отдельно:
 * их правка допустима, но количество позиции не должно уходить ниже
 * распределённого — иначе черновик обещает больше, чем есть в заказе.
 */
export function dealItemShipmentUsage(dealItemId, shipments) {
    let shippedQty = 0
    let draftQty = 0
    const shippedIn = []
    const draftIn = []

    for (const sh of shipments || []) {
        let qty = 0
        let present = false
        for (const si of sh.items || []) {
            if (si.dealItemId !== dealItemId) continue
            // Наличие строки важнее её количества: каскад снесёт и нулевую.
            present = true
            qty += toQty(si.quantity)
        }
        if (!present) continue
        if (sh.status === "SHIPPED") {
            shippedQty += qty
            shippedIn.push(sh.number)
        } else {
            draftQty += qty
            draftIn.push(sh.number)
        }
    }

    return { isShipped: shippedIn.length > 0, shippedQty, shippedIn, draftQty, draftIn }
}

export function isAdmin(session) {
    return session?.user?.role === "ADMIN"
}

// Удаляем только «мёртвые» карточки: сделку — сорванную или уже уехавшую в
// архив, проект — проработанный без потребности. В рабочих статусах кнопки нет
// вовсе: это защита от случайного удаления живой сделки, а не вопрос прав.
export function canDeleteDeal(status, session) {
    return isAdmin(session) && DEAL_DELETABLE_STATUSES.includes(status)
}

export function canDeleteProject(status, session) {
    return isAdmin(session) && PROJECT_DELETABLE_STATUSES.includes(status)
}

export function isProjectLocked(status, session) {
    return !isAdmin(session) && PROJECT_LOCKED_STATUSES.includes(status)
}

export function isDealLocked(status, session) {
    return !isAdmin(session) && DEAL_LOCKED_STATUSES.includes(status)
}

// Возвращают готовый 403-ответ для роутов или null, если менять можно.
export function projectLockResponse(status, session) {
    if (!isProjectLocked(status, session)) return null
    return Response.json({ error: PROJECT_LOCKED_ERROR }, { status: 403 })
}

export function dealLockResponse(status, session) {
    if (!isDealLocked(status, session)) return null
    return Response.json({ error: DEAL_LOCKED_ERROR }, { status: 403 })
}
