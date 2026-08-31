import ExcelJS from "exceljs"
import { requireCrmSession } from "@/lib/crm/session"
import { buildActivityReport } from "@/lib/crm/activity-report"
import { loadActivityReportData } from "@/lib/crm/activity-report-data"
import { CHANGE_ACTION_LABELS } from "@/lib/crm/change-log"
import { formatCrmDateTime } from "@/lib/crm/datetime"
import { fmtDate, xlsxResponse } from "@/lib/crm/excel"
import { formatPeriodLabel, parsePeriodParams } from "@/lib/crm/period"

function setupSheet(ws, columns) {
    ws.columns = columns
    const header = ws.getRow(1)
    header.font = { bold: true }
    header.alignment = { vertical: "middle" }
}

export async function GET(request) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    const period = parsePeriodParams(new URL(request.url).searchParams)
    const { entries } = await loadActivityReportData(period)
    // В файл идёт полная лента — лимит расшифровки снимаем: ради неё выгрузку
    // и делают.
    const report = buildActivityReport({ entries, ...period, historyLimit: Infinity })
    const periodLabel = formatPeriodLabel(period)

    const wb = new ExcelJS.Workbook()
    wb.creator = "OneStep CRM"

    // Лист 1 — свод по сотрудникам.
    const ws = wb.addWorksheet("Активность")
    setupSheet(ws, [
        { header: "№", key: "n", width: 6 },
        { header: "Сотрудник", key: "user", width: 30 },
        { header: "Должность", key: "position", width: 24 },
        { header: "Действий", key: "total", width: 12 },
        { header: "Создано", key: "create", width: 12 },
        { header: "Изменено", key: "update", width: 12 },
        { header: "Удалено", key: "delete", width: 12 },
        { header: "Активных дней", key: "days", width: 15 },
        { header: "В среднем за день", key: "perDay", width: 18 },
        { header: "Последнее действие", key: "last", width: 20 },
    ])
    report.users.forEach((u, i) => {
        ws.addRow({
            n: i + 1,
            user: u.name,
            position: u.position || "",
            total: u.total,
            create: u.create,
            update: u.update,
            delete: u.delete,
            days: u.activeDays,
            perDay: u.perDay,
            last: u.lastAt ? formatCrmDateTime(u.lastAt) : "",
        })
    })
    const t = report.totals
    ws.addRow({
        user: "ИТОГО",
        total: t.total,
        create: t.create,
        update: t.update,
        delete: t.delete,
        days: t.activeDays,
        perDay: t.perActiveDay,
    }).font = { bold: true }
    ws.addRow({})
    ws.addRow({ user: `Период: ${periodLabel}` })
    ws.addRow({
        user: "Источник — журнал изменений CRM. Действие засчитано автору записи; считаются все записи, включая позиции, файлы и заметки.",
    })
    if (t.systemTotal > 0) {
        ws.addRow({
            user: `Записей без автора (синхронизация, импорт): ${t.systemTotal} — строка «Система».`,
        })
    }

    // Лист 2 — вся лента за период: то, из чего сложились цифры.
    const wl = wb.addWorksheet("События")
    setupSheet(wl, [
        { header: "Дата и время", key: "at", width: 20 },
        { header: "Сотрудник", key: "user", width: 28 },
        { header: "Действие", key: "action", width: 12 },
        { header: "Объект", key: "entity", width: 20 },
        { header: "Карточка", key: "target", width: 46 },
        { header: "Что изменилось", key: "summary", width: 70 },
    ])
    const all = report.users
        .flatMap(u => u.entries.map(entry => ({ ...entry, userName: u.name })))
        .sort((a, b) => new Date(a.at) - new Date(b.at))
    for (const entry of all) {
        wl.addRow({
            at: formatCrmDateTime(entry.at),
            user: entry.userName,
            action: CHANGE_ACTION_LABELS[entry.action] || entry.action,
            entity: entry.entityLabel,
            target: entry.target?.name || "",
            summary: entry.summary || "",
        })
    }
    // Перечень изменений длинный — без переноса Excel растянет его через весь
    // лист.
    wl.getColumn("summary").alignment = { wrapText: true, vertical: "top" }

    const buffer = await wb.xlsx.writeBuffer()
    return xlsxResponse(buffer, `Активность в CRM ${periodLabel} (${fmtDate(new Date())}).xlsx`)
}
