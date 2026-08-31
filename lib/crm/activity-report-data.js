import prisma from "@/lib/client"
import { changeTarget } from "./change-log"
import { resolveChangeRelations, resolveChangeTargets } from "./change-log-data"
import { crmDayEnd, crmDayStart } from "./datetime"

// Выборка для отчёта «Активность в CRM». Отдельно от activity-report.js, чтобы
// расчёт оставался чистой функцией и не тянул за собой prisma.
//
// Границы разворачиваем через crmDayStart/crmDayEnd: пользователь выбирает
// московские сутки, а в базе лежат UTC-моменты, и без этого «по 31 августа»
// отрезало бы вечерние правки последнего дня.
//
// Записи журнала возвращаются полностью, без take: цифры сводки должны быть
// точными, а обрезается уже лента в расшифровке (historyLimit в расчёте).
// Идентификаторы разворачиваются в имена двумя батчами на весь период —
// и внутри changes (кто стал ответственным, какой товар), и у карточки-цели.
export async function loadActivityReportData({ from, to }) {
    const start = crmDayStart(from)
    const end = crmDayEnd(to)
    if (!start || !end) return { entries: [] }

    const rows = await prisma.changeLog.findMany({
        where: { createdAt: { gte: start, lte: end } },
        orderBy: { createdAt: "desc" },
        include: {
            author: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    position: true,
                },
            },
        },
    })

    const parsed = rows.map(r => ({
        id: r.id,
        entityType: r.entityType,
        entityId: r.entityId,
        parentEntityType: r.parentEntityType,
        parentEntityId: r.parentEntityId,
        action: r.action,
        changes: r.changes ? safeJson(r.changes) : null,
        author: r.author,
        createdAt: r.createdAt,
    }))

    const [resolved, names] = await Promise.all([
        resolveChangeRelations(parsed),
        resolveChangeTargets(parsed),
    ])

    return {
        entries: resolved.map(entry => ({ ...entry, target: changeTarget(entry, names) })),
    }
}

// Битый JSON в журнале не должен ронять отчёт: запись всё равно считается,
// просто без расшифровки полей.
function safeJson(text) {
    try {
        return JSON.parse(text)
    } catch {
        return null
    }
}
