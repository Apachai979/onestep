import { requireCrmSession } from "@/lib/crm/session"
import { parsePeriodParams } from "@/lib/crm/period"
import { buildProposalsReport, parseProposalsFilters } from "@/lib/crm/proposals-report"
import { loadProposalsReportData } from "@/lib/crm/proposals-report-data"

// Реестр КП не скрываем по ролям — как в остальных отчётах раздела:
// договорились, что сотрудники видят работу друг друга.
export async function GET(request) {
    const params = new URL(request.url).searchParams
    const { session, response } = await requireCrmSession()
    if (!session) return response

    const period = parsePeriodParams(params)
    const filters = parseProposalsFilters(params)
    const { traces, deals } = await loadProposalsReportData(period)

    return Response.json(buildProposalsReport({ traces, deals, ...period, ...filters }))
}
