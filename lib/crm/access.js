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

export function isAdmin(session) {
    return session?.user?.role === "ADMIN"
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
