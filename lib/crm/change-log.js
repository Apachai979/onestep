import { DEAL_LOSS_REASON_LABELS, DEAL_STATUS_LABELS } from "./deal"
import { PROJECT_LOSS_REASON_LABELS, PROJECT_STATUS_LABELS } from "./project"
import { SHIPMENT_STATUS_LABELS } from "./shipment"
import { TASK_STATUS_LABELS, TASK_TYPE_MAP } from "./task"

const TASK_TYPE_LABELS = Object.fromEntries(
    Object.entries(TASK_TYPE_MAP).map(([k, v]) => [k, v.label])
)

const ENUM_VALUE_LABELS = {
    Deal: { status: DEAL_STATUS_LABELS, lossReason: DEAL_LOSS_REASON_LABELS },
    Project: { status: PROJECT_STATUS_LABELS, lossReason: PROJECT_LOSS_REASON_LABELS },
    Shipment: { status: SHIPMENT_STATUS_LABELS },
    Task: { status: TASK_STATUS_LABELS, type: TASK_TYPE_LABELS },
}

export function enumValueLabel(entityType, field, value) {
    if (value == null) return value
    const map = ENUM_VALUE_LABELS[entityType]?.[field]
    if (!map) return value
    return map[value] || value
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
}

const COUNTERPARTY_FIELD_LABELS = {
    type: "Тип",
    name: "Название",
    region: "Регион",
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
    address: "Адрес",
    source: "Источник",
    companyKind: "Тип компании",
    activityArea: "Сфера деятельности",
    note: "Примечание",
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
    contactId: "Контактное лицо",
    managerId: "Ответственный менеджер",
    sourceProjectId: "Проект-источник",
    lossReason: "Причина проигрыша",
    lossComment: "Комментарий к проигрышу",
}

const PROJECT_FIELD_LABELS = {
    externalAuctionId: "Внешний идентификатор аукциона",
    internalName: "Внутреннее название",
    status: "Статус",
    totalAmount: "Сумма проекта",
    auctionDate: "Дата аукциона",
    duplicateComment: "Комментарий о дубликате",
    distributorId: "Дистрибьютор",
    endCustomerId: "Конечный потребитель",
    managerId: "Ответственный менеджер",
    lossReason: "Причина проигрыша",
    lossComment: "Комментарий к проигрышу",
}

const FIELD_LABELS = {
    Counterparty: COUNTERPARTY_FIELD_LABELS,
    Deal: DEAL_FIELD_LABELS,
    DealItem: ITEM_FIELD_LABELS,
    Project: PROJECT_FIELD_LABELS,
    ProjectItem: ITEM_FIELD_LABELS,
    Task: {
        title: "Заголовок",
        type: "Тип",
        status: "Статус",
        result: "Результат",
        assigneeId: "Ответственный",
        startAt: "Начало",
        endAt: "Срок",
    },
    Note: { body: "Текст" },
    Attachment: { fileName: "Файл" },
    Email: { to: "Кому", subject: "Тема", number: "Номер КП" },
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
