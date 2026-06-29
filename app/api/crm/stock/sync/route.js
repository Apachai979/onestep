import { requireCrmSession } from "@/lib/crm/session"
import { syncStockFromOnec } from "@/lib/crm/stock"

export async function POST() {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    try {
        const result = await syncStockFromOnec()
        return Response.json({ ok: true, ...result })
    } catch (err) {
        const status =
            err?.code === "ONEC_CONFIG_MISSING"
                ? 503
                : err?.code === "ONEC_AUTH"
                  ? 502
                  : 502
        return Response.json(
            { ok: false, error: err.message, code: err.code },
            { status },
        )
    }
}
