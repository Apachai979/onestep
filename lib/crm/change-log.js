import { COUNTERPARTY_TYPE_LABELS } from "./counterparty"
import { crmHm, formatCrmDate, formatCrmDateTime } from "./datetime"
import { DEAL_LOSS_REASON_LABELS, DEAL_STATUS_LABELS } from "./deal"
import { PROJECT_LOSS_REASON_LABELS, PROJECT_STATUS_LABELS } from "./project"
import { SHIPMENT_STATUS_LABELS } from "./shipment"
import { TENDER_CLIENT_SOURCE_LABELS } from "./tender-map"
import { TASK_STATUS_LABELS, TASK_TYPE_MAP } from "./task"

const TASK_TYPE_LABELS = Object.fromEntries(
    Object.entries(TASK_TYPE_MAP).map(([k, v]) => [k, v.label])
)

// Аукцион как сущность объединён со сделкой, но исторические записи журнала
// с entityType "Auction" остаются — держим их подписи статусов здесь.
const AUCTION_STATUS_LABELS = {
    IN_PROGRESS: "В работе",
    WON: "Выиграли",
    LOST: "Проиграли",
    CANCELLED: "Отменён",
}

const ENUM_VALUE_LABELS = {
    Counterparty: { type: COUNTERPARTY_TYPE_LABELS },
    Deal: {
        status: DEAL_STATUS_LABELS,
        lossReason: DEAL_LOSS_REASON_LABELS,
        // Сделка, заведённая по закупке, пишет в журнал служебный снимок: чем
        // и откуда она создана. Без подписей он читался как «clientSource: OWN».
        source: { Tenderland: "Тендерлэнд" },
        clientSource: TENDER_CLIENT_SOURCE_LABELS,
    },
    Project: { status: PROJECT_STATUS_LABELS, lossReason: PROJECT_LOSS_REASON_LABELS },
    Shipment: { status: SHIPMENT_STATUS_LABELS },
    Task: { status: TASK_STATUS_LABELS, type: TASK_TYPE_LABELS },
    Auction: { status: AUCTION_STATUS_LABELS },
}

export function enumValueLabel(entityType, field, value) {
    if (value == null) return value
    const map = ENUM_VALUE_LABELS[entityType]?.[field]
    if (!map) return value
    return map[value] || value
}

// Исторический ляп: роут закупок писал тип сущности как "DEAL" вместо "Deal",
// и такие записи уже лежат в базе. Нормализуем на чтении — иначе они выпадают
// из подписей ленты и из разрезов отчёта по активности отдельной строкой.
const ENTITY_TYPE_ALIASES = { DEAL: "Deal" }

export function normalizeEntityType(entityType) {
    return ENTITY_TYPE_ALIASES[entityType] || entityType
}

export const CHANGE_ACTIONS = ["CREATE", "UPDATE", "DELETE"]

export const CHANGE_ACTION_LABELS = {
    CREATE: "Создано",
    UPDATE: "Изменено",
    DELETE: "Удалено",
}

export const ENTITY_LABELS = {
    Counterparty: "Контрагент",
    Deal: "Сделка",
    DealItem: "Позиция сделки",
    Project: "Проект",
    ProjectItem: "Позиция проекта",
    Auction: "Аукцион",
    AuctionItem: "Позиция аукциона",
    Product: "Товар",
    Task: "Задача",
    Note: "Заметка",
    Attachment: "Файл",
    Email: "Письмо",
    Shipment: "Отгрузка",
    Lead: "Заявка с сайта",
}

export const CHILD_OF = {
    DealItem: "Deal",
    ProjectItem: "Project",
    AuctionItem: "Auction",
}

// Дочерние записи: сами по себе они не карточка, а часть чужой. В журнале у
// них заполнен parentEntityType/parentEntityId, и в ленте они читаются только
// вместе с родителем — «файл в сделке "…"», а не «файл».
export const CHILD_ENTITY_TYPES = new Set([
    ...Object.keys(CHILD_OF),
    "Note",
    "Attachment",
    "Email",
])

export function isChildEntity(entityType) {
    return CHILD_ENTITY_TYPES.has(normalizeEntityType(entityType))
}

// Карточки, на которые из ленты можно перейти. Список сознательно короче
// ENTITY_LABELS: у задачи и заявки с сайта своей страницы нет.
export const CHANGE_TARGET_ROUTES = {
    Deal: "/crm/deals",
    Project: "/crm/projects",
    Counterparty: "/crm/counterparties",
    Product: "/crm/products",
    Shipment: "/crm/shipments",
}

// Предлог для связки «дочерняя сущность → карточка-родитель»:
// «задача по проекту», но «позиция в сделке».
const PARENT_PREPOSITION = { Task: "по", Email: "по" }

/**
 * Цель записи журнала — карточка, к которой её относят и в ленте, и в отчёте.
 * У дочерней записи это её родитель, у остальных — она сама.
 *
 * names: { Deal: Map<id, name>, Project: Map<…>, … } — имена карточек,
 * собранные заранее одним батчем (resolveChangeTargets в change-log-data.js).
 * Имя не нашлось (карточку удалили) — цель остаётся неразрешённой, и подписью
 * служит тип сущности: «Создано Сделка».
 */
export function changeTarget(change, names = {}) {
    const entityType = normalizeEntityType(change.entityType)
    const hasParent = Boolean(change.parentEntityType && change.parentEntityId)
    const type = hasParent ? normalizeEntityType(change.parentEntityType) : entityType
    const id = hasParent ? change.parentEntityId : change.entityId
    const name = (id && names[type]?.get(id)) || null
    const route = CHANGE_TARGET_ROUTES[type]

    return {
        entityType,
        entityLabel: ENTITY_LABELS[entityType] || entityType,
        isChild: hasParent || isChildEntity(entityType),
        type,
        id: id || null,
        label: ENTITY_LABELS[type] || type,
        name,
        href: name && route && id ? `${route}/${id}` : null,
        resolved: Boolean(name),
    }
}

/** «создано», «изменено задачу по» — текст между автором и названием цели. */
export function changeActionText(change, target) {
    const action = (CHANGE_ACTION_LABELS[change.action] || change.action).toLowerCase()
    if (!target.isChild || !target.resolved) return action
    const preposition = PARENT_PREPOSITION[target.entityType] || "в"
    return `${action} ${target.entityLabel.toLowerCase()} ${preposition}`
}

export const CHANGE_ACTION_DOTS = {
    CREATE: "bg-green-500",
    UPDATE: "bg-brand_main",
    DELETE: "bg-red-500",
}

const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/

/**
 * Значение поля в человекочитаемом виде. Общее для ленты изменений в карточке,
 * отчёта по активности и Excel-выгрузки: расходись эти форматы, одно и то же
 * изменение выглядело бы в трёх местах по-разному.
 */
export function formatChangeValue(value, { maxLength = 80 } = {}) {
    if (value === null || value === undefined) return "—"
    // Флаги (isAuction, isGroupPrimary) хранятся булевыми — «true» в ленте
    // менеджеру ничего не говорит.
    if (typeof value === "boolean") return value ? "Да" : "Нет"
    if (Array.isArray(value)) return value.join(", ") || "—"
    // Даты лежат в истории ISO-строками. Показываем их по-московски, а границы
    // суток (задача «на весь день») — просто датой, без 00:00 и 23:59.
    if (typeof value === "string" && ISO_RE.test(value)) {
        const hm = crmHm(value)
        return hm === "00:00" || hm === "23:59" ? formatCrmDate(value) : formatCrmDateTime(value)
    }
    const s = String(value)
    if (maxLength && s.length > maxLength) return s.slice(0, maxLength) + "…"
    return s
}

export function isDiffValue(value) {
    return Boolean(value) && typeof value === "object" && ("from" in value || "to" in value)
}

/**
 * Изменения одной записи строкой — для Excel и подсказок, где разметки нет.
 * В снимке «Создано» пустые поля пропускаем: выключенный флаг так же пуст, как
 * незаполненное поле, и списка они не стоят.
 */
export function changesToText(entityType, changes, { maxLength = 80 } = {}) {
    if (!changes || typeof changes !== "object" || Array.isArray(changes)) return ""
    const parts = []
    for (const [field, value] of Object.entries(changes)) {
        const label = fieldLabel(normalizeEntityType(entityType), field)
        if (isDiffValue(value)) {
            parts.push(
                `${label}: ${formatChangeValue(value.from, { maxLength })} → ${formatChangeValue(value.to, { maxLength })}`
            )
            continue
        }
        if (value === null || value === undefined || value === "" || value === false) continue
        parts.push(`${label}: ${formatChangeValue(value, { maxLength })}`)
    }
    return parts.join("; ")
}

const COUNTERPARTY_FIELD_LABELS = {
    type: "Тип",
    name: "Название",
    region: "Регион",
    city: "Город",
    inn: "ИНН",
    kpp: "КПП",
    ogrn: "ОГРН",
    okpo: "ОКПО",
    okved: "ОКВЭД",
    bankName: "Название банка",
    bankAccount: "Расчётный счёт",
    bankCorrAccount: "Корреспондентский счёт",
    bik: "БИК",
    totalRevenue: "Бюджет",
    discount: "Скидка",
    phone: "Телефон",
    email: "Email",
    website: "Веб-сайт",
    address: "Адрес",
    source: "Источник",
    companyKind: "Тип компании",
    activityArea: "Сфера деятельности",
    priority: "Приоритет",
    note: "Примечание",
    managerId: "Ответственный менеджер",
    isOwnCompany: "Наша компания",
    groupId: "Группа компаний",
    isGroupPrimary: "Головное юрлицо группы",
}

const ITEM_FIELD_LABELS = {
    sku: "Артикул",
    name: "Наименование",
    quantity: "Количество",
    amount: "Сумма",
    productId: "Товар (справочник)",
}

const DEAL_FIELD_LABELS = {
    title: "Название",
    status: "Статус",
    totalAmount: "Сумма сделки",
    discount: "Скидка, %",
    note: "Примечание",
    deliveryAddress: "Адрес доставки",
    counterpartyId: "Клиент",
    payerId: "Плательщик",
    contactId: "Контактное лицо",
    managerId: "Ответственный менеджер",
    sourceProjectId: "Проект-источник",
    lossReason: "Причина проигрыша",
    lossComment: "Комментарий к проигрышу",
    // Аукцион — те же поля, что и в карточке сделки (вкладка «Аукцион»).
    isAuction: "Аукцион",
    purchaseNumber: "Номер закупки",
    auctionUrl: "Ссылка на аукцион",
    nmck: "НМЦК",
    bidsDeadlineAt: "Окончание сбора заявок",
    auctionAt: "Проведение аукциона",
    // Поля в сделке больше нет, подпись оставлена для старых записей журнала.
    resultsAt: "Подведение итогов",
    participantsCount: "Количество участников",
    bidsCount: "Количество заявок",
    winner: "Победитель",
    auctionCustomerId: "Заказчик (конечный потребитель)",
    auctionCustomerContactId: "Контакт заказчика",
    // Снимок создания сделки по закупке Tenderland — не поля карточки, но в
    // журнале лежат рядом с ними. projectId остался от старых записей: теперь
    // пишется sourceProjectId, как поле сделки.
    source: "Источник",
    tenderlandId: "Закупка в Тендерлэнде",
    // Закупку привязали к уже существующей сделке (развилка дублей в /crm/tenders).
    linkedTender: "Привязана закупка",
    clientSource: "Клиент подставлен",
    projectId: "Проект-источник",
}

const PROJECT_FIELD_LABELS = {
    externalAuctionId: "Внешний идентификатор аукциона",
    internalName: "Внутреннее название",
    status: "Статус",
    discount: "Скидка, %",
    totalAmount: "Сумма проекта",
    auctionDate: "Дата аукциона",
    duplicateComment: "Комментарий о дубликате",
    duplicateOfId: "Исходный проект (дубль)",
    distributorId: "Дистрибьютор",
    endCustomerId: "Конечный потребитель",
    managerId: "Ответственный менеджер",
    lossReason: "Причина проигрыша",
    lossComment: "Причина (нет потребности)",
}

const AUCTION_FIELD_LABELS = {
    purchaseNumber: "Номер закупки",
    auctionUrl: "Ссылка на аукцион",
    status: "Статус",
    nmck: "НМЦК",
    bidsDeadlineAt: "Окончание сбора заявок",
    auctionAt: "Проведение аукциона",
    resultsAt: "Подведение итогов",
    participantsCount: "Количество участников",
    bidsCount: "Количество заявок",
    winner: "Победитель",
    lossComment: "Причина проигрыша",
    customerContactId: "Контакт заказчика",
    supplierContactId: "Контакт поставщика",
    managerId: "Ответственный менеджер",
}

const FIELD_LABELS = {
    Counterparty: COUNTERPARTY_FIELD_LABELS,
    Deal: DEAL_FIELD_LABELS,
    DealItem: ITEM_FIELD_LABELS,
    Project: PROJECT_FIELD_LABELS,
    ProjectItem: ITEM_FIELD_LABELS,
    Auction: AUCTION_FIELD_LABELS,
    AuctionItem: ITEM_FIELD_LABELS,
    Task: {
        title: "Заголовок",
        type: "Тип",
        status: "Статус",
        result: "Результат",
        assigneeId: "Ответственный",
        startAt: "Начало",
        endAt: "Срок",
    },
    Shipment: { number: "Номер", status: "Статус" },
    Note: { body: "Текст" },
    Attachment: { fileName: "Файл" },
    Email: {
        to: "Кому",
        subject: "Тема",
        number: "Номер КП",
        attachments: "Вложения",
    },
    Lead: {
        name: "Имя",
        company: "Компания",
        email: "Email",
        phone: "Телефон",
    },
}

export function fieldLabel(entityType, field) {
    return FIELD_LABELS[entityType]?.[field] || field
}

function normalize(value) {
    if (value === undefined || value === null) return null
    if (value instanceof Date) return value.toISOString()
    if (typeof value === "object" && typeof value.toString === "function") {
        const s = value.toString()
        if (s !== "[object Object]") return s
    }
    return value
}

export function diffEntities(before, after, fields) {
    const changes = {}
    for (const key of fields) {
        const b = normalize(before?.[key])
        const a = normalize(after?.[key])
        if (b === a) continue
        if ((b === null || b === "") && (a === null || a === "")) continue
        changes[key] = { from: b, to: a }
    }
    return changes
}

// Короткая выдержка для журнала — полные тексты живут в своих сущностях.
export function excerpt(s, n = 80) {
    const t = String(s || "").replace(/\s+/g, " ").trim()
    if (!t) return null
    return t.length > n ? t.slice(0, n) + "…" : t
}

export function snapshotEntity(entity, fields) {
    const out = {}
    for (const key of fields) {
        out[key] = normalize(entity?.[key])
    }
    return out
}

export async function logChange(
    tx,
    { entityType, entityId, action, payload, authorId, parentEntityType, parentEntityId }
) {
    if (!entityType || !entityId || !action) return null
    if (action === "UPDATE" && payload && Object.keys(payload).length === 0) return null
    return tx.changeLog.create({
        data: {
            entityType,
            entityId,
            parentEntityType: parentEntityType || null,
            parentEntityId: parentEntityId || null,
            action,
            changes: payload ? JSON.stringify(payload) : null,
            authorId: authorId || null,
        },
    })
}
