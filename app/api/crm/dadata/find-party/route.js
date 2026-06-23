import { requireCrmSession } from "@/lib/crm/session"
import { searchParty } from "@/lib/crm/dadata"

export async function POST(request) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    let body
    try {
        body = await request.json()
    } catch {
        return Response.json({ error: "Некорректный JSON" }, { status: 400 })
    }

    const query = typeof body.query === "string" ? body.query.trim() : ""
    if (!query) return Response.json({ items: [] })

    const token = process.env.DADATA_API_KEY
    if (!token) {
        return Response.json(
            { error: "DADATA_API_KEY не задан в .env" },
            { status: 503 },
        )
    }

    try {
        const items = await searchParty(query, { token })
        return Response.json({ items })
    } catch (err) {
        return Response.json(
            { error: err?.message || "Ошибка обращения к DaData" },
            { status: 502 },
        )
    }
}
