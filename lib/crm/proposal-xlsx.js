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
// Первая колонка — поле слева: документ не прижимается к краю листа, как и
// в PDF-версии (там это padding страницы). Из-за неё содержимое начинается
// с колонки B, поэтому номера ячеек ниже сдвинуты на единицу.
const COLUMNS = [
    { key: "gutter", width: 3 },
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
// Содержимое живёт в B..J: A — поле слева.
const FIRST_COL = "B"
const FIRST_COL_IDX = 2
const LAST_COL = "J"

// Сколько знаков 9pt влезает в строку параметров (мердж B:J). Ширина колонок
// задана в знаках шрифта по умолчанию (11pt), поэтому мелкого текста входит
// больше; берём с запасом — лишняя пустая строка безобиднее обрезанного
// названия.
const PARAM_ROW_CHARS = 150

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

/** Строка на всю ширину содержимого: объединяет B..J и возвращает ячейку. */
function fullRow(ws, value, style = {}) {
    const row = ws.addRow([null, value])
    ws.mergeCells(`${FIRST_COL}${row.number}:${LAST_COL}${row.number}`)
    const cell = row.getCell(FIRST_COL_IDX)
    if (style.font) cell.font = style.font
    if (style.alignment) cell.alignment = style.alignment
    if (style.height) row.height = style.height
    return row
}

/**
 * Пара «Лейбл: значение» одной строкой на всю ширину листа.
 * Лейбл и значение живут в одной ячейке rich-текстом — так лейбл не обрезается
 * узкой колонкой «№», а значение не упирается в границу мерджа.
 */
function paramRow(ws, label, value) {
    const row = ws.addRow([])
    ws.mergeCells(`${FIRST_COL}${row.number}:${LAST_COL}${row.number}`)
    const cell = row.getCell(FIRST_COL_IDX)
    const text = `${label}: ${value || "—"}`
    cell.value = {
        richText: [
            { font: { size: 9, color: { argb: "FF666666" } }, text: `${label}: ` },
            { font: { size: 9 }, text: value || "—" },
        ],
    }
    // Длинное название («Областное государственное автономное учреждение …»)
    // в мердж одной строкой не влезает, а обрезанный покупатель — брак
    // документа. Высоту при переносе считаем сами: у объединённых ячеек
    // автоподбор высоты в Excel не работает.
    cell.alignment = { vertical: "middle", wrapText: true }
    row.height = 14 * Math.max(1, Math.ceil(text.length / PARAM_ROW_CHARS))
    return row
}

/** Строка блока итогов: подпись в H:I, значение в J. */
function totalsRow(ws, label, value, isMoney = true) {
    const row = ws.addRow([])
    row.getCell(8).value = label
    ws.mergeCells(`H${row.number}:I${row.number}`)
    row.getCell(8).font = { size: 9, bold: true }
    row.getCell(8).alignment = { horizontal: "right" }
    row.getCell(8).border = BOX
    row.getCell(9).border = BOX

    const valueCell = row.getCell(10)
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
        ws.mergeCells(`E${row.number}:${LAST_COL}${row.number}`)
        const cell = row.getCell(5)
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
                tl: { col: 1.15, row: headerStart - 1 + 0.1 },
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
    const headRow = ws.addRow([null, ...HEADERS])
    headRow.height = 30
    headRow.eachCell((cell, col) => {
        if (col < FIRST_COL_IDX) return // поле слева — не часть таблицы
        cell.font = { size: 9, bold: true }
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true }
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F2F2" } }
        cell.border = BOX
    })

    const firstItemRow = headRow.number + 1
    for (const item of items) {
        const row = ws.addRow([
            null, // поле слева
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

        const nameCell = row.getCell(4)
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
            if (col < FIRST_COL_IDX) return // поле слева: без рамки и заливки
            cell.border = BOX
            if (!cell.font) cell.font = { size: 9 }
            if (col === 2) cell.alignment = { horizontal: "center", vertical: "top" }
            else if (col === 3) cell.alignment = { horizontal: "left", vertical: "top" }
            else if (col === 4) cell.alignment = { wrapText: true, vertical: "top" }
            else cell.alignment = { horizontal: "right", vertical: "top" }
        })
        row.getCell(3).font = { size: 9 }
        for (const col of [5, 7, 9]) {
            const v = row.getCell(col).value
            if (typeof v === "number") {
                row.getCell(col).numFmt = Number.isInteger(v) ? QTY_INT_FMT : QTY_FMT
            }
        }
        row.getCell(6).numFmt = MONEY_FMT
        row.getCell(8).numFmt = MONEY_FMT
        row.getCell(10).numFmt = MONEY_FMT
        for (const col of [5, 6, 7, 8, 9, 10]) row.getCell(col).font = { size: 9 }
    }

    if (items.length === 0) {
        const row = ws.addRow([null, "", "", "В сделке нет товарных позиций"])
        row.eachCell({ includeEmpty: true }, (cell, col) => {
            if (col < FIRST_COL_IDX) return
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
        items.length > 0
            ? { formula: `SUM(${LAST_COL}${firstItemRow}:${LAST_COL}${lastItemRow})` }
            : totals.sub
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

    // Подпись занимает B:C: в колонку «№» (5 знаков) слово «Итого:» не влезает,
    // а соседнюю ячейку заняло число — Excel обрезал бы подпись по границе.
    // Сумма остаётся числом в своей ячейке, а не текстом в общей строке.
    const finalRow = ws.addRow([])
    ws.mergeCells(`${FIRST_COL}${finalRow.number}:C${finalRow.number}`)
    finalRow.getCell(FIRST_COL_IDX).value = "Итого:"
    finalRow.getCell(FIRST_COL_IDX).font = { size: 10, bold: true }
    finalRow.getCell(4).value = totals.finalAmount
    finalRow.getCell(4).numFmt = MONEY_FMT
    finalRow.getCell(4).font = { size: 10, bold: true }
    finalRow.getCell(4).alignment = { horizontal: "left" }

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
