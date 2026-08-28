import { requireAdmin } from "@/lib/crm/admin"
import { requireCrmSession } from "@/lib/crm/session"
import { refreshTenders, syncTenders } from "@/lib/crm/tenders"
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
    const cron = isCronRequest(request)

    let body = {}
    try {
        body = await request.json()
    } catch {
        // Тело необязательно: кнопка «Обновить закупки» шлёт пустой запрос.
    }

    // Полная выгрузка тянет архив автопоиска целиком и способна выесть суточный
    // лимит данных, поэтому доступна только администратору и только вручную.
    if (body?.full) {
        const { response } = await requireAdmin()
        if (response) return response
    } else if (!cron) {
        const { session, response } = await requireCrmSession()
        if (!session) return response
    }

    try {
        // Порядок важен: сначала забираем новые (им сразу проставляется отметка
        // последнего изменения), потом сверяем отслеживаемые — так свежие
        // закупки не попадут в доборы того же прогона.
        const synced = await syncTenders({ full: Boolean(body?.full) })
        const refreshed = await refreshTenders()
        return Response.json({ ok: true, ...synced, refreshed })
    } catch (err) {
        return Response.json(
            { ok: false, error: err.message, code: err.code },
            { status: TENDERLAND_ERROR_STATUS[err.code] || 502 },
        )
    }
}
