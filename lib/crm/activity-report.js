// Отчёт «Активность в CRM».
//
// Отвечает на вопрос «кто и над чем работал в системе за период». Источник —
// журнал изменений (ChangeLog): другого следа работы в CRM нет, и он же питает
// ленту «Последняя активность» на главной. Отчёт — та же лента, только со
// сводкой сверху и периодом вместо последних двенадцати записей.
//
// Ось времени одна — ChangeLog.createdAt: запись журнала это факт, а не
// состояние, задним числом она не меняется. Здесь нет второй оси, как в отчёте
// по задачам, и сравнивать нечего.
//
// Действие принадлежит АВТОРУ записи. Записи без автора (ночная синхронизация
// закупок, импорт) собираются отдельной строкой «Система» и в число активных
// сотрудников не входят: это работа машины, приписывать её людям нельзя.
//
// Считаются ВСЕ записи журнала, включая дочерние — позиции сделок, файлы,
// заметки. Менеджер, поправивший состав из двадцати позиций, даст двадцать
// событий, и это осознанно: отчёт меряет объём работы в системе, а не число
// «важных» действий, а порог значимости пришлось бы придумывать и защищать.
// Перекос видно в самой ленте: события подписаны объектом, и фильтр в
// расшифровке сотрудника считает их по видам.
//
// Даты сравниваются календарными днями в зоне CRM (Москва), а не моментами:
// период — это московские сутки, и правка в 23:40 последнего дня должна
// остаться в периоде при любой зоне сервера.
import { changesToText, CHANGE_ACTIONS, ENTITY_LABELS } from "./change-log"
import { crmYmd } from "./datetime"
import { displayName } from "./profile"

// Лента в раскрытии строки режется: каждая запись тащит за собой changes, и
// год работы активного менеджера в JSON не влезает. Полный список — в Excel,
// поэтому обрезку подписываем, а не прячем.
export const ACTIVITY_HISTORY_LIMIT = 300

export const ACTIVITY_SYSTEM_KEY = "—"

function userName(u) {
    if (!u) return "Система"
    return displayName(u) || "Система"
}

function bump(map, key, init) {
    let row = map.get(key)
    if (!row) {
        row = init()
        map.set(key, row)
    }
    return row
}

function emptyActions() {
    return { total: 0, CREATE: 0, UPDATE: 0, DELETE: 0 }
}

function countAction(row, action) {
    row.total += 1
    if (CHANGE_ACTIONS.includes(action)) row[action] += 1
}

/**
 * Собирает отчёт из уже загруженных записей журнала (чистая функция — выборка
 * и разворачивание идентификаторов живут в activity-report-data.js).
 *
 * entries: записи ChangeLog за период, приведённые к виду
 *   { id, createdAt, action, entityType, target: { … }, changes, author }
 *   — target и человекочитаемые changes готовит слой выборки.
 * historyLimit: сколько событий оставить в расшифровке сотрудника.
 *   Excel-выгрузка снимает лимит (Infinity) — файл открывают ради полной ленты.
 */
export function buildActivityReport({
    entries = [],
    from = null,
    to = null,
    historyLimit = ACTIVITY_HISTORY_LIMIT,
} = {}) {
    const users = new Map()

    const totals = { ...emptyActions(), systemTotal: 0 }
    const allDays = new Set()

    for (const entry of entries) {
        const day = crmYmd(entry.createdAt)
        if (!day) continue

        const author = entry.author || null
        const userId = author?.id || ACTIVITY_SYSTEM_KEY
        const target = entry.target || {}
        const entityType = target.entityType || entry.entityType

        countAction(totals, entry.action)
        if (!author) totals.systemTotal += 1
        allDays.add(day)

        const u = bump(users, userId, () => ({
            id: author?.id || null,
            name: userName(author),
            position: author?.position || null,
            isSystem: !author,
            ...emptyActions(),
            days: new Set(),
            entities: new Map(),
            lastAt: null,
            entries: [],
        }))
        countAction(u, entry.action)
        u.days.add(day)
        if (!u.lastAt || new Date(entry.createdAt) > new Date(u.lastAt)) u.lastAt = entry.createdAt

        // Разрез по объектам живёт только на строке сотрудника: сводный по
        // отделу ничего не объяснял — он повторял структуру данных, а не
        // работу («позиций больше, чем сделок»). Здесь же он работает
        // фильтром ленты.
        const ue = bump(u.entities, entityType, () => ({ key: entityType, total: 0 }))
        ue.total += 1

        u.entries.push({
            id: entry.id,
            at: entry.createdAt,
            action: entry.action,
            entityType,
            entityLabel: ENTITY_LABELS[entityType] || entityType,
            isChild: Boolean(target.isChild),
            target: target.name
                ? { label: target.label, name: target.name, href: target.href || null }
                : null,
            changes: entry.changes || null,
            // Текстом — для Excel и подсказок: разметки там нет, а понимать,
            // что именно поменялось, нужно так же.
            summary: changesToText(entityType, entry.changes),
        })
    }

    const userRows = Array.from(users.values())
        .map(u => {
            const sorted = u.entries.sort((a, b) => new Date(b.at) - new Date(a.at))
            const activeDays = u.days.size
            return {
                id: u.id,
                name: u.name,
                position: u.position,
                isSystem: u.isSystem,
                total: u.total,
                create: u.CREATE,
                update: u.UPDATE,
                delete: u.DELETE,
                activeDays,
                perDay: activeDays ? Math.round((u.total / activeDays) * 10) / 10 : 0,
                lastAt: u.lastAt,
                entities: Array.from(u.entities.values())
                    .map(x => ({ ...x, label: ENTITY_LABELS[x.key] || x.key }))
                    .sort((a, b) => b.total - a.total),
                entriesCount: sorted.length,
                entriesTruncated: sorted.length > historyLimit,
                entries: Number.isFinite(historyLimit) ? sorted.slice(0, historyLimit) : sorted,
            }
        })
        // Строка «Система» всегда внизу: это фон, а не участник сравнения.
        .sort((a, b) => Number(a.isSystem) - Number(b.isSystem) || b.total - a.total)

    const activeDays = allDays.size

    return {
        period: { from, to },
        users: userRows,
        totals: {
            total: totals.total,
            create: totals.CREATE,
            update: totals.UPDATE,
            delete: totals.DELETE,
            systemTotal: totals.systemTotal,
            activeDays,
            // Средняя нагрузка считается по дням, когда в CRM вообще работали:
            // делить на все дни периода значит размазывать работу по выходным
            // и праздникам и получать цифру, которой не было ни в один день.
            perActiveDay: activeDays ? Math.round((totals.total / activeDays) * 10) / 10 : 0,
            usersCount: userRows.filter(u => !u.isSystem).length,
        },
    }
}
