import ExcelJS from "exceljs"
import { requireCrmSession } from "@/lib/crm/session"
import { formatCrmDate, formatCrmDateTime } from "@/lib/crm/datetime"
import { fmtDate, xlsxResponse } from "@/lib/crm/excel"
import { formatPeriodLabel, parsePeriodParams } from "@/lib/crm/period"
import { TASK_STATUS_LABELS, TASK_TYPE_MAP } from "@/lib/crm/task"
import { buildTasksReport } from "@/lib/crm/tasks-report"
import { loadTasksReportData } from "@/lib/crm/tasks-report-data"

function setupSheet(ws, columns) {
    ws.columns = columns
    const header = ws.getRow(1)
    header.font = { bold: true }
    header.alignment = { vertical: "middle" }
}

function typeLabel(key) {
    return TASK_TYPE_MAP[key]?.label || key || ""
}

export async function GET(request) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    const period = parsePeriodParams(new URL(request.url).searchParams)
    const { tasks } = await loadTasksReportData(period)
    // В файл идёт полная история — лимит расшифровки снимаем: ради неё выгрузку
    // и делают.
    const report = buildTasksReport({ tasks, ...period, historyLimit: Infinity })
    const periodLabel = formatPeriodLabel(period)

    const wb = new ExcelJS.Workbook()
    wb.creator = "OneStep CRM"

    // Лист 1 — свод по исполнителям: обе оси рядом, как на странице отчёта.
    const ws = wb.addWorksheet("Задачи менеджеров")
    setupSheet(ws, [
        { header: "№", key: "n", width: 6 },
        { header: "Менеджер", key: "manager", width: 30 },
        { header: "Должность", key: "position", width: 24 },
        { header: "Закрыто за период", key: "closed", width: 18 },
        { header: "Выполнено", key: "done", width: 12 },
        { header: "Не выполнено", key: "failed", width: 14 },
        { header: "% выполнения", key: "doneRate", width: 14 },
        { header: "В срок", key: "onTime", width: 10 },
        { header: "С опозданием", key: "late", width: 14 },
        { header: "% в срок", key: "onTimeRate", width: 11 },
        { header: "Запланировано (срок в периоде)", key: "planned", width: 26 },
        { header: "Из них открыто", key: "open", width: 15 },
        { header: "Просрочено", key: "overdue", width: 12 },
        { header: "Поставил задач", key: "created", width: 15 },
        { header: "в т.ч. другим", key: "createdOthers", width: 14 },
    ])
    report.managers.forEach((m, i) => {
        ws.addRow({
            n: i + 1,
            manager: m.name,
            position: m.position || "",
            closed: m.closed.total,
            done: m.closed.done,
            failed: m.closed.failed,
            doneRate: m.doneRate,
            onTime: m.closed.doneOnTime,
            late: m.closed.doneLate,
            onTimeRate: m.onTimeRate,
            planned: m.planned.total,
            open: m.planned.open,
            overdue: m.planned.overdue,
            created: m.created.total,
            createdOthers: m.created.forOthers,
        })
    })
    const t = report.totals
    ws.addRow({
        manager: "ИТОГО",
        closed: t.closed.total,
        done: t.closed.done,
        failed: t.closed.failed,
        doneRate: t.doneRate,
        onTime: t.closed.doneOnTime,
        late: t.closed.doneLate,
        onTimeRate: t.onTimeRate,
        planned: t.planned.total,
        open: t.planned.open,
        overdue: t.planned.overdue,
        created: t.created.total,
        createdOthers: t.created.forOthers,
    }).font = { bold: true }
    ws.addRow({})
    ws.addRow({ manager: `Период: ${periodLabel}` })
    ws.addRow({
        manager:
            "«Закрыто за период» — по дате закрытия задачи; «запланировано» — задачи, срок которых пришёлся на период. Задача засчитана исполнителю.",
    })
    if (t.undatedClosed > 0) {
        ws.addRow({
            manager: `Закрытых задач без даты закрытия: ${t.undatedClosed} — в «сделано» они не попали.`,
        })
    }

    // Лист 2 — чем занимались: закрытые задачи в разрезе типов.
    const wt = wb.addWorksheet("По типам")
    setupSheet(wt, [
        { header: "Тип задачи", key: "type", width: 28 },
        { header: "Закрыто", key: "closed", width: 12 },
        { header: "Выполнено", key: "done", width: 12 },
        { header: "Не выполнено", key: "failed", width: 14 },
        { header: "Менеджеров", key: "managers", width: 13 },
    ])
    for (const row of report.types) {
        wt.addRow({
            type: typeLabel(row.key),
            closed: row.closed,
            done: row.done,
            failed: row.failed,
            managers: row.managersCount,
        })
    }

    // Лист 3 — кто раздавал поручения: задачи, ЗАВЕДЁННЫЕ в периоде.
    const wc = wb.addWorksheet("Постановщики")
    setupSheet(wc, [
        { header: "Сотрудник", key: "name", width: 30 },
        { header: "Поставил задач", key: "total", width: 15 },
        { header: "Другим", key: "others", width: 11 },
        { header: "Себе", key: "self", width: 11 },
        { header: "Исполнителей", key: "assignees", width: 14 },
    ])
    for (const c of report.creators) {
        wc.addRow({
            name: c.name,
            total: c.total,
            others: c.forOthers,
            self: c.forSelf,
            assignees: c.assigneesCount,
        })
    }

    // Лист 4 — вся история задач за период: то, из чего сложились цифры.
    const wl = wb.addWorksheet("Задачи")
    setupSheet(wl, [
        { header: "Менеджер", key: "manager", width: 28 },
        // Тема, описание и итог идут подряд — тот же порядок, что в отчёте на
        // экране: так строку читают слева направо как одну запись.
        { header: "Задача", key: "title", width: 46 },
        { header: "Описание", key: "description", width: 50 },
        { header: "Итог", key: "result", width: 50 },
        { header: "Тип", key: "type", width: 22 },
        { header: "Статус", key: "status", width: 15 },
        { header: "Срок", key: "due", width: 18 },
        { header: "Закрыта", key: "closed", width: 18 },
        { header: "В срок", key: "onTime", width: 10 },
        { header: "Привязка", key: "relationKind", width: 16 },
        { header: "Карточка", key: "relation", width: 44 },
        { header: "Поставил", key: "createdBy", width: 28 },
    ])
    const all = report.managers
        .flatMap(m => m.tasks.map(task => ({ ...task, managerName: m.name })))
        .sort((a, b) => new Date(a.closedAt || a.endAt) - new Date(b.closedAt || b.endAt))
    for (const task of all) {
        wl.addRow({
            manager: task.managerName,
            title: task.title,
            description: task.description || "",
            result: task.result || "",
            type: typeLabel(task.type),
            status:
                task.status === "OPEN" && task.overdue
                    ? "Просрочена"
                    : TASK_STATUS_LABELS[task.status] || task.status,
            due: task.allDay ? formatCrmDate(task.endAt) : formatCrmDateTime(task.endAt),
            closed: task.closedAt ? formatCrmDateTime(task.closedAt) : "",
            onTime: task.closedAt ? (task.late ? "нет" : "да") : "",
            relationKind: task.relation?.label || "",
            relation: task.relation?.name || "",
            createdBy: task.createdByName || "",
        })
    }
    // Описание и итог многострочные — без переноса Excel растянет их в одну
    // строку через весь лист.
    for (const key of ["title", "description", "result"]) {
        wl.getColumn(key).alignment = { wrapText: true, vertical: "top" }
    }

    const buffer = await wb.xlsx.writeBuffer()
    return xlsxResponse(buffer, `Задачи менеджеров ${periodLabel} (${fmtDate(new Date())}).xlsx`)
}
