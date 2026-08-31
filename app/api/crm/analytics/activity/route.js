import { requireCrmSession } from "@/lib/crm/session"
import { parsePeriodParams } from "@/lib/crm/period"
import { buildActivityReport } from "@/lib/crm/activity-report"
import { loadActivityReportData } from "@/lib/crm/activity-report-data"

// Цифры отчёта не скрываем по ролям — как в «Продажах» и «Задачах менеджеров»:
// договорились, что сотрудники видят работу друг друга.
export async function GET(request) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    const period = parsePeriodParams(new URL(request.url).searchParams)
    const { entries } = await loadActivityReportData(period)

    return Response.json(buildActivityReport({ entries, ...period }))
}
