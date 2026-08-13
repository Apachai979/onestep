import ExcelJS from "exceljs"
import { requireCrmSession } from "@/lib/crm/session"
import { formatCrmDate } from "@/lib/crm/datetime"
import { DEAL_STATUS_LABELS } from "@/lib/crm/deal"
import { fmtDate, xlsxResponse } from "@/lib/crm/excel"
import { formatMonthKey, formatPeriodLabel, parsePeriodParams } from "@/lib/crm/period"
import { buildSalesReport } from "@/lib/crm/sales"
import { loadSalesData } from "@/lib/crm/sales-data"

const MONEY = '# ##0.00 ₽'

function setupSheet(ws, columns) {
    ws.columns = columns
    const header = ws.getRow(1)
    header.font = { bold: true }
    header.alignment = { vertical: "middle" }
    for (const col of columns) {
        if (col.money) ws.getColumn(col.key).numFmt = MONEY
    }
}

export async function GET(request) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    const period = parsePeriodParams(new URL(request.url).searchParams)
    const { shipments } = await loadSalesData(period)
    const report = buildSalesReport({ shipments, ...period })
    const periodLabel = formatPeriodLabel(period)

    const wb = new ExcelJS.Workbook()
    wb.creator = "OneStep CRM"

    // Лист 1 — свод по менеджерам с помесячной разбивкой: главная таблица
    // отчёта, ради неё файл и выгружают.
    const ws = wb.addWorksheet("Продажи менеджеров")
    setupSheet(ws, [
        { header: "№", key: "n", width: 6 },
        { header: "Менеджер", key: "manager", width: 30 },
        { header: "Должность", key: "position", width: 24 },
        { header: "Продано", key: "amount", width: 18, money: true },
        { header: "Доля, %", key: "share", width: 10 },
        { header: "Отгрузок", key: "shipments", width: 11 },
        { header: "Сделок", key: "deals", width: 9 },
        { header: "Клиентов", key: "clients", width: 11 },
        { header: "Штук", key: "qty", width: 11 },
        ...report.months.map((m, i) => ({
            header: formatMonthKey(m.key),
            key: `m${i}`,
            width: 15,
            money: true,
        })),
    ])
    report.managers.forEach((m, i) => {
        const row = {
            n: i + 1,
            manager: m.name,
            position: m.position || "",
            amount: m.amount,
            share: m.share,
            shipments: m.shipmentsCount,
            deals: m.dealsCount,
            clients: m.counterpartiesCount,
            qty: m.qty,
        }
        m.byMonth.forEach((value, mi) => {
            row[`m${mi}`] = value
        })
        ws.addRow(row)
    })
    const totalsRow = {
        manager: "ИТОГО",
        amount: report.totals.amount,
        shipments: report.totals.shipmentsCount,
        deals: report.totals.dealsCount,
        clients: report.totals.counterpartiesCount,
        qty: report.totals.qty,
    }
    report.months.forEach((m, i) => {
        totalsRow[`m${i}`] = m.amount
    })
    ws.addRow(totalsRow).font = { bold: true }
    ws.addRow({})
    ws.addRow({ manager: `Период: ${periodLabel}` })
    ws.addRow({
        manager: "Продажа = проведённая отгрузка по фактической дате; суммы со скидкой сделки.",
    })

    // Лист 2 — динамика по месяцам.
    const wm = wb.addWorksheet("По месяцам")
    setupSheet(wm, [
        { header: "Месяц", key: "month", width: 16 },
        { header: "Продано", key: "amount", width: 18, money: true },
        { header: "Отгрузок", key: "shipments", width: 11 },
        { header: "Штук", key: "qty", width: 11 },
    ])
    for (const m of report.months) {
        wm.addRow({
            month: formatMonthKey(m.key),
            amount: m.amount,
            shipments: m.shipmentsCount,
            qty: m.qty,
        })
    }

    // Лист 3 — кто сколько купил, по всем менеджерам.
    const wc = wb.addWorksheet("По клиентам")
    setupSheet(wc, [
        { header: "№", key: "n", width: 6 },
        { header: "Контрагент", key: "name", width: 46 },
        { header: "ИНН", key: "inn", width: 14 },
        { header: "Продано", key: "amount", width: 18, money: true },
        { header: "Отгрузок", key: "shipments", width: 11 },
        { header: "Штук", key: "qty", width: 11 },
        { header: "Менеджеров", key: "managers", width: 13 },
    ])
    report.counterparties.forEach((c, i) => {
        wc.addRow({
            n: i + 1,
            name: c.name,
            inn: c.inn || "",
            amount: c.amount,
            shipments: c.shipmentsCount,
            qty: c.qty,
            managers: c.managersCount,
        })
    })

    // Лист 4 — что именно продано.
    const wp = wb.addWorksheet("По товарам")
    setupSheet(wp, [
        { header: "№", key: "n", width: 6 },
        { header: "Артикул", key: "sku", width: 18 },
        { header: "Наименование", key: "name", width: 46 },
        { header: "Штук", key: "qty", width: 11 },
        { header: "Продано", key: "amount", width: 18, money: true },
        { header: "В справочнике", key: "matched", width: 14 },
    ])
    report.products.forEach((p, i) => {
        wp.addRow({
            n: i + 1,
            sku: p.sku || "",
            name: p.name,
            qty: p.qty,
            amount: p.amount,
            matched: p.matched ? "да" : "нет",
        })
    })

    // Лист 5 — расшифровка до документа: из чего сложилась цифра менеджера.
    const wsh = wb.addWorksheet("Отгрузки")
    setupSheet(wsh, [
        { header: "Дата", key: "date", width: 12 },
        { header: "Номер", key: "number", width: 16 },
        { header: "Менеджер", key: "manager", width: 30 },
        { header: "Контрагент", key: "cp", width: 40 },
        { header: "Сделка", key: "deal", width: 44 },
        { header: "Статус сделки", key: "status", width: 24 },
        { header: "Позиций", key: "positions", width: 10 },
        { header: "Штук", key: "qty", width: 11 },
        { header: "Сумма", key: "amount", width: 18, money: true },
        { header: "Оформил", key: "createdBy", width: 30 },
    ])
    const allShipments = report.managers
        .flatMap(m => m.shipments.map(s => ({ ...s, managerName: m.name })))
        .sort((a, b) => new Date(a.shippedAt) - new Date(b.shippedAt))
    for (const s of allShipments) {
        wsh.addRow({
            date: formatCrmDate(s.shippedAt),
            number: s.number,
            manager: s.managerName,
            cp: s.counterpartyName,
            deal: s.dealTitle,
            status: DEAL_STATUS_LABELS[s.dealStatus] || s.dealStatus || "",
            positions: s.positionsCount,
            qty: s.qty,
            amount: s.amount,
            createdBy: s.createdByName || "",
        })
    }

    const buffer = await wb.xlsx.writeBuffer()
    return xlsxResponse(buffer, `Продажи менеджеров ${periodLabel} (${fmtDate(new Date())}).xlsx`)
}
