import { requireCrmSession } from "@/lib/crm/session"
import { lastSyncPoint, syncTenders } from "@/lib/crm/tenders"

// Статусы под коды ошибок адаптера: настройки чинит админ (503), всё остальное —
// это проблема на стороне Тендерлэнда или сети (502).
const STATUS_BY_CODE = {
    TENDERLAND_CONFIG_MISSING: 503,
    USER_INVALID_API_KEY: 502,
    USER_DISABLE_API_MODULE: 502,
    API_REQUEST_LIMIT: 429,
    API_TOO_MANY_REQUESTS: 429,
}

export async function POST(request) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    let body = {}
    try {
        body = await request.json()
    } catch {
        // Тело необязательно: кнопка «Загрузить закупки» шлёт пустой запрос.
    }

    try {
        // По умолчанию догружаем от последней известной закупки. Полная выгрузка
        // (full: true) нужна при первом запуске и после правки фильтра в кабинете.
        const since = body?.full ? null : await lastSyncPoint()
        const result = await syncTenders({ since })
        return Response.json({ ok: true, ...result })
    } catch (err) {
        return Response.json(
            { ok: false, error: err.message, code: err.code },
            { status: STATUS_BY_CODE[err.code] || 502 },
        )
    }
}
