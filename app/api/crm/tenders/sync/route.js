import { requireCrmSession } from "@/lib/crm/session"
import { autoSkipExpiredTenders, refreshTenders, syncTenders } from "@/lib/crm/tenders"
import { TENDERLAND_ERROR_STATUS } from "@/lib/crm/tenderland"

/**
 * Планировщику сессия недоступна, поэтому ночной запуск входит по общему
 * секрету. Пока TENDERS_CRON_SECRET не задан, дверь закрыта совсем — пустой
 * заголовок не должен совпасть с пустой переменной окружения.
 */
function isCronRequest(request) {
    const secret = process.env.TENDERS_CRON_SECRET
    if (!secret) return false
    return request.headers.get("x-cron-secret") === secret
}

export async function POST(request) {
    if (!isCronRequest(request)) {
        const { session, response } = await requireCrmSession()
        if (!session) return response
    }

    try {
        // Порядок важен: выгрузка проставляет отметку последнего изменения
        // всем, чьи данные принесла, поэтому идущая следом сверка не полезет
        // добирать — платно — то, что уже приехало в этом же прогоне.
        const synced = await syncTenders()
        const refreshed = await refreshTenders()
        // Разбор чистится здесь же, а не отдельным заданием: сети эта операция
        // не требует, а прогон и так ежедневный. Идёт последним — закупка,
        // которой только что продлили приём заявок, уже не считается
        // просроченной.
        const expired = await autoSkipExpiredTenders()
        return Response.json({ ok: true, ...synced, refreshed, expired })
    } catch (err) {
        return Response.json(
            { ok: false, error: err.message, code: err.code },
            { status: TENDERLAND_ERROR_STATUS[err.code] || 502 },
        )
    }
}
