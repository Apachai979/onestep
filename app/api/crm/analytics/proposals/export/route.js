import ExcelJS from "exceljs"
import { requireCrmSession } from "@/lib/crm/session"
import { DEAL_STATUS_LABELS } from "@/lib/crm/deal"
import { formatCrmDateTime } from "@/lib/crm/datetime"
import { fmtDate, xlsxResponse } from "@/lib/crm/excel"
import { formatPeriodLabel, parsePeriodParams } from "@/lib/crm/period"
import { buildProposalsReport, parseProposalsFilters } from "@/lib/crm/proposals-report"
import { loadProposalsReportData } from "@/lib/crm/proposals-report-data"

export async function GET(request) {
    const params = new URL(request.url).searchParams
    const { session, response } = await requireCrmSession()
    if (!session) return response

    const period = parsePeriodParams(params)
    const filters = parseProposalsFilters(params)
    const { traces, deals } = await loadProposalsReportData(period)
    // Отбор тот же, что на экране, а вот лимит строк снимаем: полный реестр —
    // ровно то, ради чего выгрузку и делают.
    const report = buildProposalsReport({
        traces,
        deals,
        ...period,
        ...filters,
        limit: Infinity,
    })
    const periodLabel = formatPeriodLabel(period)

    const wb = new ExcelJS.Workbook()
    wb.creator = "OneStep CRM"

    const ws = wb.addWorksheet("КП")
    ws.columns = [
        { header: "№", key: "n", width: 6 },
        { header: "Сформировано", key: "at", width: 20 },
        { header: "Номер КП", key: "number", width: 14 },
        { header: "Дата в документе", key: "docDate", width: 18 },
        { header: "Сделка", key: "deal", width: 42 },
        { header: "Клиент", key: "client", width: 36 },
        { header: "Статус сделки", key: "status", width: 24 },
        { header: "Менеджер", key: "manager", width: 26 },
        { header: "Кто сформировал", key: "author", width: 26 },
        { header: "В документах сделки", key: "saved", width: 20 },
        { header: "Отправлено", key: "sent", width: 12 },
        { header: "Кому", key: "to", width: 34 },
    ]
    const header = ws.getRow(1)
    header.font = { bold: true }
    header.alignment = { vertical: "middle" }

    report.rows.forEach((row, i) => {
        ws.addRow({
            n: i + 1,
            at: formatCrmDateTime(row.at),
            number: row.number || "",
            docDate: row.documentDate || "",
            deal: row.dealTitle || "Сделка без названия",
            client: row.counterpartyName || "",
            status: DEAL_STATUS_LABELS[row.dealStatus] || row.dealStatus,
            manager: row.managerName || "",
            author: row.authors.join(", "),
            saved: row.saved ? "Да" : "",
            sent: row.sent ? (row.sentCount > 1 ? `Да (${row.sentCount})` : "Да") : "",
            to: row.sentTo.join(", "),
        })
    })

    const t = report.totals
    ws.addRow({})
    ws.addRow({ number: "ИТОГО", deal: `${t.total} КП` }).font = { bold: true }
    ws.addRow({
        deal: `Отправлено письмом: ${t.sent} · без отправки из CRM: ${t.notSent} · сделок: ${t.dealsCount} · клиентов: ${t.counterpartiesCount}`,
    })
    ws.addRow({ deal: `Период: ${periodLabel}` })
    if (filters.managerId || filters.counterpartyId || filters.status) {
        const applied = []
        if (filters.managerId) {
            applied.push(
                `менеджер — ${labelOf(report.filters.managers, filters.managerId)}`,
            )
        }
        if (filters.counterpartyId) {
            applied.push(
                `клиент — ${labelOf(report.filters.counterparties, filters.counterpartyId)}`,
            )
        }
        if (filters.status) {
            applied.push(
                `статус сделки — ${DEAL_STATUS_LABELS[filters.status] || filters.status}`,
            )
        }
        ws.addRow({ deal: `Отбор: ${applied.join("; ")}` })
    }
    ws.addRow({
        deal:
            "Источник — документы сделок и записи об отправке КП. " +
            "КП, которое просто скачали и отправили из личной почты, следа в CRM не оставляет и в реестр не попадает.",
    })

    const buffer = await wb.xlsx.writeBuffer()
    return xlsxResponse(buffer, `Коммерческие предложения ${periodLabel} (${fmtDate(new Date())}).xlsx`)
}

function labelOf(options, value) {
    return options.find(o => o.value === value)?.label || value
}
