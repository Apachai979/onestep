import ExcelJS from "exceljs"

// Рендер коммерческого предложения в xlsx. На вход идёт тот же docData,
// что и в renderProposalPdf (см. lib/crm/proposal-doc.js), поэтому Excel-версия
// всегда совпадает с PDF по содержимому.

const BORDER = { style: "thin", color: { argb: "FF808080" } }
const BOX = { top: BORDER, left: BORDER, bottom: BORDER, right: BORDER }
const MONEY_FMT = "# ##0.00"
// Для дробных количеств. Целые печатаем форматом без дробной части: формат
// вида «0.###» в Excel рисует «10,» — висящий разделитель у целого числа.
const QTY_FMT = "# ##0.###"
const QTY_INT_FMT = "# ##0"

const LOGO_WIDTH = 150 // px; высота считается из пропорций исходника
const LOGO_RATIO = 550 / 237

// Ширины подобраны так, чтобы лист печатался на A4 в одну страницу по ширине.
const COLUMNS = [
    { key: "n", width: 5 },
    { key: "sku", width: 15 },
    { key: "name", width: 48 },
    { key: "qty", width: 11 },
    { key: "price", width: 13 },
    { key: "packQty", width: 11 },
    { key: "packPrice", width: 13 },
    { key: "packs", width: 10 },
    { key: "amount", width: 15 },
]
const LAST_COL = "I"

const HEADERS = [
    "№",
    "Артикул",
    "Наименование товара",
    "Кол-во шт.",
    "Цена за шт.",
    "В тр. уп., шт.",
    "Цена за уп.",
    "Тр. уп.",
    "Сумма, руб.",
]

function num(v) {
    const n = Number(v)
    return Number.isFinite(n) ? n : null
}

/** Строка на всю ширину листа: объединяет A..I и возвращает первую ячейку. */
function fullRow(ws, value, style = {}) {
    const row = ws.addRow([value])
    ws.mergeCells(`A${row.number}:${LAST_COL}${row.number}`)
    const cell = row.getCell(1)
    if (style.font) cell.font = style.font
    if (style.alignment) cell.alignment = style.alignment
    if (style.height) row.height = style.height
    return row
}

/**
 * Пара «Лейбл: значение» одной строкой на всю ширину листа.
 * Лейбл и значение живут в одной ячейке rich-текстом — так лейбл не обрезается
 * узкой колонкой A, а значение не упирается в границу мерджа.
 */
function paramRow(ws, label, value) {
    const row = ws.addRow([])
    ws.mergeCells(`A${row.number}:${LAST_COL}${row.number}`)
    const cell = row.getCell(1)
    cell.value = {
        richText: [
            { font: { size: 9, color: { argb: "FF666666" } }, text: `${label}: ` },
            { font: { size: 9 }, text: value || "—" },
        ],
    }
    cell.alignment = { vertical: "middle" }
    row.height = 14
    return row
}

/** Строка блока итогов: подпись в G:H, значение в I. */
function totalsRow(ws, label, value, isMoney = true) {
    const row = ws.addRow([])
    row.getCell(7).value = label
    ws.mergeCells(`G${row.number}:H${row.number}`)
    row.getCell(7).font = { size: 9, bold: true }
    row.getCell(7).alignment = { horizontal: "right" }
    row.getCell(7).border = BOX
    row.getCell(8).border = BOX

    const valueCell = row.getCell(9)
    valueCell.value = value
    valueCell.font = { size: 9 }
    valueCell.alignment = { horizontal: "right" }
    valueCell.border = BOX
    if (isMoney) valueCell.numFmt = MONEY_FMT
    return row
}

export async function renderProposalXlsx(data) {
    const {
        seller,
        logoSrc,
        number,
        date,
        validDays,
        buyer,
        endCustomer,
        deliveryTerm,
        paymentTerm,
        deliveryCondition,
        intro,
        items,
        totals,
        volume,
        weight,
        senderName,
        senderPhone,
        senderEmail,
    } = data

    const wb = new ExcelJS.Workbook()
    wb.creator = seller.name
    wb.created = new Date()

    const ws = wb.addWorksheet("КП", {
        pageSetup: {
            paperSize: 9, // A4
            orientation: "landscape",
            fitToPage: true,
            fitToWidth: 1,
            fitToHeight: 0,
            margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
        },
        views: [{ showGridLines: false }],
    })
    ws.columns = COLUMNS.map(c => ({ key: c.key, width: c.width }))

    // --- Шапка: логотип слева, реквизиты продавца справа ---
    const headerStart = ws.rowCount + 1
    const sellerLines = [seller.address, seller.phones, seller.email, seller.site]
    sellerLines.forEach(line => {
        const row = ws.addRow([])
        row.height = 13
        ws.mergeCells(`D${row.number}:${LAST_COL}${row.number}`)
        const cell = row.getCell(4)
        cell.value = line
        cell.font = { size: 8, color: { argb: "FF333333" } }
        cell.alignment = { horizontal: "right", vertical: "middle" }
    })

    if (logoSrc) {
        const base64 = String(logoSrc).replace(/^data:image\/\w+;base64,/, "")
        try {
            const imageId = wb.addImage({ base64, extension: "png" })
            // Пропорции исходника logo_name.png — 550×237 (≈2.32:1).
            // Если меняешь ширину — пересчитай высоту, иначе логотип сплющит.
            ws.addImage(imageId, {
                tl: { col: 0.15, row: headerStart - 1 + 0.1 },
                ext: { width: LOGO_WIDTH, height: Math.round(LOGO_WIDTH / LOGO_RATIO) },
                editAs: "oneCell",
            })
        } catch {
            // логотип не критичен — без него документ всё равно валиден
        }
    }

    ws.addRow([])

    // --- Заголовок ---
    fullRow(ws, `Коммерческое предложение № ${number} от ${date}`, {
        font: { size: 12, bold: true },
        alignment: { horizontal: "center" },
        height: 20,
    })
    fullRow(ws, `действительно ${validDays} рабочих дней`, {
        font: { size: 9, italic: true, color: { argb: "FF666666" } },
        alignment: { horizontal: "center" },
    })
    ws.addRow([])

    // --- Параметры ---
    paramRow(ws, "Покупатель", buyer)
    if (endCustomer) paramRow(ws, "Конечный потребитель", endCustomer)
    paramRow(ws, "Срок поставки", deliveryTerm)
    paramRow(ws, "Условия оплаты", paymentTerm)
    paramRow(ws, "Условия поставки", deliveryCondition)
    ws.addRow([])

    // --- Вступление ---
    fullRow(ws, intro, {
        font: { size: 10 },
        alignment: { wrapText: true, vertical: "middle" },
        height: 22,
    })
    ws.addRow([])

    // --- Таблица товаров ---
    const headRow = ws.addRow(HEADERS)
    headRow.height = 30
    headRow.eachCell(cell => {
        cell.font = { size: 9, bold: true }
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true }
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F2F2" } }
        cell.border = BOX
    })

    const firstItemRow = headRow.number + 1
    for (const item of items) {
        const row = ws.addRow([
            item.n,
            item.sku || "—",
            null, // наполняется ниже rich-текстом (название + состав)
            num(item.qty),
            num(item.unitPrice),
            item.packQty ? num(item.packQty) : "—",
            item.packPrice !== null && item.packPrice !== undefined ? num(item.packPrice) : "—",
            item.packs !== null && item.packs !== undefined ? num(item.packs) : "—",
            num(item.amount),
        ])

        const nameCell = row.getCell(3)
        nameCell.value = item.contents
            ? {
                  richText: [
                      { font: { size: 9, bold: true }, text: item.name },
                      {
                          font: { size: 8, color: { argb: "FF555555" } },
                          text: `\n${item.contents}`,
                      },
                  ],
              }
            : { richText: [{ font: { size: 9, bold: true }, text: item.name }] }

        row.eachCell({ includeEmpty: true }, (cell, col) => {
            cell.border = BOX
            if (!cell.font) cell.font = { size: 9 }
            if (col === 1) cell.alignment = { horizontal: "center", vertical: "top" }
            else if (col === 2) cell.alignment = { horizontal: "left", vertical: "top" }
            else if (col === 3) cell.alignment = { wrapText: true, vertical: "top" }
            else cell.alignment = { horizontal: "right", vertical: "top" }
        })
        row.getCell(2).font = { size: 9 }
        for (const col of [4, 6, 8]) {
            const v = row.getCell(col).value
            if (typeof v === "number") {
                row.getCell(col).numFmt = Number.isInteger(v) ? QTY_INT_FMT : QTY_FMT
            }
        }
        row.getCell(5).numFmt = MONEY_FMT
        row.getCell(7).numFmt = MONEY_FMT
        row.getCell(9).numFmt = MONEY_FMT
        for (const col of [4, 5, 6, 7, 8, 9]) row.getCell(col).font = { size: 9 }
    }

    if (items.length === 0) {
        const row = ws.addRow(["", "", "В сделке нет товарных позиций"])
        row.eachCell({ includeEmpty: true }, cell => {
            cell.border = BOX
            cell.font = { size: 9, italic: true, color: { argb: "FF999999" } }
        })
    }
    const lastItemRow = ws.rowCount

    ws.addRow([])

    // --- Итоги ---
    // «ИТОГО» считается формулой по колонке сумм — правки в таблице
    // пересчитываются прямо в Excel.
    const sumFormula =
        items.length > 0 ? { formula: `SUM(I${firstItemRow}:I${lastItemRow})` } : totals.sub
    totalsRow(ws, "ИТОГО:", sumFormula)
    if (totals.discountPct > 0) {
        totalsRow(ws, "Скидка:", `${totals.discountPct}%`, false)
        totalsRow(ws, "Сумма скидки:", totals.discountAmount)
        totalsRow(ws, "Итого со скидкой:", totals.finalAmount)
    }
    if (totals.vatRate > 0) {
        totalsRow(ws, `В т.ч. НДС ${totals.vatRate}%:`, totals.vatAmount)
    }

    ws.addRow([])

    const finalRow = ws.addRow([])
    finalRow.getCell(1).value = "Итого:"
    finalRow.getCell(1).font = { size: 10, bold: true }
    finalRow.getCell(2).value = totals.finalAmount
    finalRow.getCell(2).numFmt = MONEY_FMT
    finalRow.getCell(2).font = { size: 10, bold: true }
    finalRow.getCell(2).alignment = { horizontal: "left" }

    fullRow(ws, totals.words, {
        font: { size: 9, italic: true, color: { argb: "FF333333" } },
        alignment: { wrapText: true, vertical: "top" },
    })

    if (volume || weight) {
        ws.addRow([])
        if (volume) {
            fullRow(ws, `Объём груза, м³: ${volume}`, {
                font: { size: 8, italic: true, color: { argb: "FF666666" } },
                alignment: { horizontal: "right" },
            })
        }
        if (weight) {
            fullRow(ws, `Вес груза, кг: ${weight}`, {
                font: { size: 8, italic: true, color: { argb: "FF666666" } },
                alignment: { horizontal: "right" },
            })
        }
    }

    ws.addRow([])
    fullRow(
        ws,
        `Настоящее коммерческое предложение не является офертой (в соответствии со ст. 435 ГК РФ). ${seller.name} оставляет за собой право не заключать договор, либо заключить договор на иных условиях, отличных от предложенных.`,
        {
            font: { size: 8, color: { argb: "FF666666" } },
            alignment: { wrapText: true, vertical: "top" },
            height: 28,
        },
    )

    ws.addRow([])
    const signature = ["С уважением,", senderName || "—"]
    if (senderPhone) signature.push(`Тел. ${senderPhone}`)
    if (senderEmail) signature.push(`Email: ${senderEmail}`)
    for (const line of signature) {
        fullRow(ws, line, { font: { size: 9 }, alignment: { horizontal: "left" } })
    }

    return Buffer.from(await wb.xlsx.writeBuffer())
}
