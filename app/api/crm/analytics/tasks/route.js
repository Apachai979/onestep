import { requireCrmSession } from "@/lib/crm/session"
import { parsePeriodParams } from "@/lib/crm/period"
import { buildTasksReport } from "@/lib/crm/tasks-report"
import { loadTasksReportData } from "@/lib/crm/tasks-report-data"

// Цифры отчёта не скрываем по ролям — как и в «Продажах менеджеров»:
// договорились, что сотрудники видят работу друг друга.
export async function GET(request) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    const period = parsePeriodParams(new URL(request.url).searchParams)
    const { tasks } = await loadTasksReportData(period)

    return Response.json(buildTasksReport({ tasks, ...period }))
}
