import { requireCrmSession } from "@/lib/crm/session"
import { parsePeriodParams, previousPeriod } from "@/lib/crm/period"
import { buildSalesReport } from "@/lib/crm/sales"
import { loadSalesData, loadSalesTotal } from "@/lib/crm/sales-data"

// Цифры отчёта не скрываем по ролям: договорились, что менеджеры видят
// продажи друг друга, — поэтому здесь только общая проверка доступа в CRM.
export async function GET(request) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    const period = parsePeriodParams(new URL(request.url).searchParams)
    const { shipments } = await loadSalesData(period)
    const report = buildSalesReport({ shipments, ...period })

    // Предыдущий период считаем отдельным проходом: он нужен только одной
    // цифрой в шапке, тащить ради неё вторую копию отчёта незачем.
    const previous = previousPeriod(period)
    if (previous) {
        report.previous = { ...previous, amount: await loadSalesTotal(previous) }
    }

    return Response.json(report)
}
