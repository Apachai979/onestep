import { requireCrmSession } from "@/lib/crm/session"
import { buildSupplyReport } from "@/lib/crm/supply"
import { loadSupplyData } from "@/lib/crm/supply-data"

export async function GET() {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    const { products, deals } = await loadSupplyData()
    return Response.json(buildSupplyReport({ products, deals }))
}
