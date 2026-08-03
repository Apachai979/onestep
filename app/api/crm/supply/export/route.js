import ExcelJS from "exceljs"
import { requireCrmSession } from "@/lib/crm/session"
import { DEAL_STATUS_LABELS } from "@/lib/crm/deal"
import { fmtDate, xlsxResponse } from "@/lib/crm/excel"
import { buildSupplyReport } from "@/lib/crm/supply"
import { loadSupplyData } from "@/lib/crm/supply-data"

function setupSheet(ws, columns) {
    ws.columns = columns
    const header = ws.getRow(1)
    header.font = { bold: true }
    header.alignment = { vertical: "middle" }
}

export async function GET() {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    const { products, deals } = await loadSupplyData()
    const report = buildSupplyReport({ products, deals })

    const wb = new ExcelJS.Workbook()
    wb.creator = "OneStep CRM"

    // Лист 1 — баланс по товарам. Склады идут отдельными колонками: где
    // физически лежит товар, видно, но «Свободно» считается от общего итога.
    const ws = wb.addWorksheet("Обеспечение")
    setupSheet(ws, [
        { header: "№", key: "n", width: 6 },
        { header: "Артикул", key: "sku", width: 18 },
        { header: "Наименование", key: "name", width: 46 },
        { header: "Категория", key: "category", width: 26 },
        ...report.warehouses.map((w, i) => ({ header: w, key: `w${i}`, width: 18 })),
        { header: "Итого на складах", key: "stock", width: 16 },
        { header: "К обеспечению", key: "need", width: 15 },
        { header: "Свободный остаток", key: "free", width: 17 },
        { header: "Сумма к обеспечению", key: "amount", width: 20 },
        { header: "Сделок", key: "deals", width: 9 },
    ])
    report.products.forEach((p, i) => {
        const row = {
            n: i + 1,
            sku: p.sku,
            name: p.name,
            category: p.category,
            stock: p.stockTotal,
            need: p.needQty,
            free: p.freeQty,
            amount: p.needAmount,
            deals: p.dealsCount,
        }
        report.warehouses.forEach((w, wi) => {
            row[`w${wi}`] = p.stockByWarehouse[w] ?? 0
        })
        ws.addRow(row)
    })
    ws.addRow({
        name: "ИТОГО",
        stock: report.totals.stockTotal,
        need: report.totals.matchedNeedQty,
        free: report.totals.freeQty,
    }).font = { bold: true }

    // Лист 2 — кто и сколько ждёт.
    const wc = wb.addWorksheet("По контрагентам")
    setupSheet(wc, [
        { header: "№", key: "n", width: 6 },
        { header: "Контрагент", key: "name", width: 46 },
        { header: "ИНН", key: "inn", width: 14 },
        { header: "Сделок", key: "deals", width: 9 },
        { header: "Позиций", key: "items", width: 10 },
        { header: "Кол-во к обеспечению", key: "need", width: 20 },
        { header: "Сумма к обеспечению", key: "amount", width: 20 },
    ])
    report.counterparties.forEach((c, i) => {
        wc.addRow({
            n: i + 1,
            name: c.name,
            inn: c.inn || "",
            deals: c.dealsCount,
            items: c.itemsCount,
            need: c.needQty,
            amount: c.needAmount,
        })
    })
    wc.addRow({
        name: "ИТОГО",
        need: report.totals.needQty,
        amount: report.totals.needAmount,
    }).font = { bold: true }

    // Лист 3 — расшифровка: каждая строка согласованной сделки.
    const wi = wb.addWorksheet("Позиции сделок")
    setupSheet(wi, [
        { header: "Контрагент", key: "cp", width: 40 },
        { header: "ИНН", key: "inn", width: 14 },
        { header: "Сделка", key: "deal", width: 44 },
        { header: "Статус сделки", key: "status", width: 24 },
        { header: "Артикул", key: "sku", width: 18 },
        { header: "Наименование", key: "name", width: 46 },
        { header: "Заказано", key: "ordered", width: 11 },
        { header: "Отгружено", key: "shipped", width: 11 },
        { header: "К обеспечению", key: "need", width: 15 },
        { header: "Сумма к обеспечению", key: "amount", width: 20 },
        { header: "В справочнике", key: "matched", width: 14 },
    ])
    const allSources = [
        ...report.products.flatMap(p => p.deals),
        ...report.unmatched.flatMap(u => u.deals),
    ].sort((a, b) => a.counterpartyName.localeCompare(b.counterpartyName, "ru"))
    for (const s of allSources) {
        wi.addRow({
            cp: s.counterpartyName,
            inn: s.counterpartyInn || "",
            deal: s.dealTitle,
            status: DEAL_STATUS_LABELS[s.dealStatus] || s.dealStatus || "",
            sku: s.sku || "",
            name: s.name,
            ordered: s.orderedQty,
            shipped: s.shippedQty,
            need: s.needQty,
            amount: s.needAmount,
            matched: s.matched ? "да" : "нет",
        })
    }

    const buffer = await wb.xlsx.writeBuffer()
    return xlsxResponse(buffer, `Обеспечение ${fmtDate(new Date())}.xlsx`)
}
