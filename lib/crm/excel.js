// Хелперы для импорта/экспорта Excel (exceljs).

// Ячейка exceljs может быть строкой, числом, датой, rich-text или гиперссылкой.
export function cellStr(v) {
    if (v === null || v === undefined) return ""
    if (v instanceof Date) {
        const dd = String(v.getDate()).padStart(2, "0")
        const mm = String(v.getMonth() + 1).padStart(2, "0")
        return `${dd}.${mm}.${v.getFullYear()}`
    }
    if (typeof v === "object") {
        if (typeof v.text === "string") return v.text.trim()
        if (Array.isArray(v.richText)) return v.richText.map(t => t.text).join("").trim()
        if (v.result !== undefined) return cellStr(v.result)
        return ""
    }
    return String(v).trim()
}

export function cellNum(v) {
    if (v === null || v === undefined || v === "") return null
    if (typeof v === "number") return Number.isFinite(v) ? v : null
    const n = Number(cellStr(v).replace(/\s/g, "").replace(",", "."))
    return Number.isFinite(n) ? n : null
}

// «03.07.2026» или Date-ячейка → Date | null
export function cellDate(v) {
    if (v instanceof Date) return v
    const s = cellStr(v)
    if (!s) return null
    const m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
    if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]))
    const d = new Date(s)
    return Number.isNaN(d.getTime()) ? null : d
}

/**
 * Лист → массив объектов по заголовкам первой строки.
 * Заголовки нормализуются (trim + lower), пустые строки пропускаются.
 */
export function sheetToObjects(ws) {
    if (!ws) return []
    const headers = []
    ws.getRow(1).eachCell({ includeEmpty: true }, (cell, col) => {
        headers[col] = cellStr(cell.value).toLowerCase()
    })
    const rows = []
    ws.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return
        const obj = { __row: rowNumber }
        let hasData = false
        row.eachCell({ includeEmpty: true }, (cell, col) => {
            const key = headers[col]
            if (!key) return
            obj[key] = cell.value
            if (cellStr(cell.value)) hasData = true
        })
        if (hasData) rows.push(obj)
    })
    return rows
}

// «Метка» → ключ enum-а по словарю подписей (без регистра).
export function labelToKey(labels, value, fallback = null) {
    const s = String(value || "").trim().toLowerCase()
    if (!s) return fallback
    for (const [key, label] of Object.entries(labels)) {
        if (label.toLowerCase() === s || key.toLowerCase() === s) return key
    }
    return fallback
}

export function xlsxResponse(buffer, fileName) {
    return new Response(buffer, {
        headers: {
            "Content-Type":
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
            "Cache-Control": "no-store",
        },
    })
}
