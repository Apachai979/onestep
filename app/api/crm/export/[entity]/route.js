import ExcelJS from "exceljs"
import prisma from "@/lib/client"
import { requireCrmSession } from "@/lib/crm/session"
import { DEAL_LOSS_REASON_LABELS, DEAL_STATUS_LABELS } from "@/lib/crm/deal"
import { PROJECT_STATUS_LABELS } from "@/lib/crm/project"
import { xlsxResponse } from "@/lib/crm/excel"

const CP_TYPE_LABELS = {
    DISTRIBUTOR: "Дистрибьютор",
    END_CUSTOMER: "Конечный потребитель",
}

function num(v) {
    const n = Number(v)
    return Number.isFinite(n) ? n : null
}

function fmtDate(d) {
    if (!d) return ""
    const x = new Date(d)
    const dd = String(x.getDate()).padStart(2, "0")
    const mm = String(x.getMonth() + 1).padStart(2, "0")
    return `${dd}.${mm}.${x.getFullYear()}`
}

function managerEmail(u) {
    return u?.email || ""
}

function setupSheet(ws, columns) {
    ws.columns = columns
    const header = ws.getRow(1)
    header.font = { bold: true }
    header.alignment = { vertical: "middle" }
}

async function exportCounterparties(wb) {
    const items = await prisma.counterparty.findMany({
        orderBy: { name: "asc" },
        include: {
            contacts: { orderBy: [{ lastName: "asc" }] },
            manager: { select: { email: true } },
        },
    })
    const ws = wb.addWorksheet("Контрагенты")
    setupSheet(ws, [
        { header: "№", key: "n", width: 6 },
        { header: "Тип", key: "type", width: 22 },
        { header: "Название", key: "name", width: 40 },
        { header: "Регион", key: "region", width: 22 },
        { header: "ИНН", key: "inn", width: 14 },
        { header: "КПП", key: "kpp", width: 12 },
        { header: "ОГРН", key: "ogrn", width: 16 },
        { header: "Телефон", key: "phone", width: 18 },
        { header: "Email", key: "email", width: 26 },
        { header: "Менеджер (email)", key: "manager", width: 26 },
        { header: "Адрес", key: "address", width: 40 },
        { header: "Источник", key: "source", width: 20 },
        { header: "Скидка %", key: "discount", width: 10 },
        { header: "Примечание", key: "note", width: 40 },
    ])
    const wc = wb.addWorksheet("Контакты")
    setupSheet(wc, [
        { header: "№ контрагента", key: "n", width: 14 },
        { header: "Фамилия", key: "lastName", width: 18 },
        { header: "Имя", key: "firstName", width: 18 },
        { header: "Телефон", key: "phone", width: 18 },
        { header: "Email", key: "email", width: 26 },
        { header: "Должность", key: "position", width: 22 },
        { header: "Основной", key: "isPrimary", width: 10 },
    ])
    items.forEach((c, i) => {
        const n = i + 1
        ws.addRow({
            n,
            type: CP_TYPE_LABELS[c.type] || c.type,
            name: c.name,
            region: c.region,
            inn: c.inn || "",
            kpp: c.kpp || "",
            ogrn: c.ogrn || "",
            phone: c.phone || "",
            email: c.email || "",
            manager: c.manager?.email || "",
            address: c.address || "",
            source: c.source || "",
            discount: num(c.discount),
            note: c.note || "",
        })
        for (const ct of c.contacts) {
            wc.addRow({
                n,
                lastName: ct.lastName || "",
                firstName: ct.firstName || "",
                phone: ct.phone || "",
                email: ct.email || "",
                position: ct.position || "",
                isPrimary: ct.isPrimary ? "Да" : "",
            })
        }
    })
    return "Контрагенты"
}

async function exportDeals(wb) {
    const items = await prisma.deal.findMany({
        orderBy: { createdAt: "asc" },
        include: {
            counterparty: { select: { name: true, inn: true } },
            manager: { select: { email: true } },
            items: { orderBy: { createdAt: "asc" } },
        },
    })
    const ws = wb.addWorksheet("Сделки")
    setupSheet(ws, [
        { header: "№", key: "n", width: 6 },
        { header: "Название", key: "title", width: 36 },
        { header: "Клиент", key: "cp", width: 36 },
        { header: "ИНН клиента", key: "inn", width: 14 },
        { header: "Статус", key: "status", width: 24 },
        { header: "Сумма", key: "amount", width: 14 },
        { header: "Скидка %", key: "discount", width: 10 },
        { header: "Менеджер (email)", key: "manager", width: 26 },
        { header: "Адрес доставки", key: "delivery", width: 36 },
        { header: "Примечание", key: "note", width: 36 },
        { header: "Причина проигрыша", key: "lossReason", width: 24 },
        { header: "Комментарий к проигрышу", key: "lossComment", width: 30 },
        { header: "Создана", key: "created", width: 12 },
    ])
    const wi = wb.addWorksheet("Позиции")
    setupSheet(wi, [
        { header: "№ сделки", key: "n", width: 10 },
        { header: "Артикул", key: "sku", width: 14 },
        { header: "Наименование", key: "name", width: 44 },
        { header: "Кол-во", key: "qty", width: 10 },
        { header: "Сумма", key: "amount", width: 14 },
    ])
    items.forEach((d, i) => {
        const n = i + 1
        ws.addRow({
            n,
            title: d.title || "",
            cp: d.counterparty?.name || "",
            inn: d.counterparty?.inn || "",
            status: DEAL_STATUS_LABELS[d.status] || d.status,
            amount: num(d.totalAmount),
            discount: num(d.discount),
            manager: managerEmail(d.manager),
            delivery: d.deliveryAddress || "",
            note: d.note || "",
            lossReason: d.lossReason
                ? DEAL_LOSS_REASON_LABELS[d.lossReason] || d.lossReason
                : "",
            lossComment: d.lossComment || "",
            created: fmtDate(d.createdAt),
        })
        for (const it of d.items) {
            wi.addRow({
                n,
                sku: it.sku || "",
                name: it.name,
                qty: num(it.quantity),
                amount: num(it.amount),
            })
        }
    })
    return "Сделки"
}

async function exportProjects(wb) {
    const items = await prisma.project.findMany({
        orderBy: { createdAt: "asc" },
        include: {
            distributor: { select: { name: true, inn: true } },
            endCustomer: { select: { name: true, inn: true } },
            manager: { select: { email: true } },
        },
    })
    // Сумма проекта — производная от привязанных сделок.
    const sums = await prisma.deal.groupBy({
        by: ["sourceProjectId"],
        where: { sourceProjectId: { not: null } },
        _sum: { totalAmount: true },
    })
    const sumMap = new Map(sums.map(s => [s.sourceProjectId, Number(s._sum.totalAmount || 0)]))

    const ws = wb.addWorksheet("Проекты")
    setupSheet(ws, [
        { header: "№", key: "n", width: 6 },
        { header: "Внутреннее название", key: "title", width: 40 },
        { header: "Статус", key: "status", width: 16 },
        { header: "Сумма сделок", key: "amount", width: 14 },
        { header: "Дистрибьютор", key: "dist", width: 36 },
        { header: "ИНН дистрибьютора", key: "distInn", width: 16 },
        { header: "Потребитель", key: "cust", width: 36 },
        { header: "ИНН потребителя", key: "custInn", width: 16 },
        { header: "Менеджер (email)", key: "manager", width: 26 },
    ])
    items.forEach((p, i) => {
        ws.addRow({
            n: i + 1,
            title: p.internalName,
            status: PROJECT_STATUS_LABELS[p.status] || p.status,
            amount: sumMap.get(p.id) || 0,
            dist: p.distributor?.name || "",
            distInn: p.distributor?.inn || "",
            cust: p.endCustomer?.name || "",
            custInn: p.endCustomer?.inn || "",
            manager: managerEmail(p.manager),
        })
    })
    return "Проекты"
}

const EXPORTERS = {
    counterparties: exportCounterparties,
    deals: exportDeals,
    projects: exportProjects,
}

export async function GET(_request, { params }) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    const exporter = EXPORTERS[params.entity]
    if (!exporter) return Response.json({ error: "Неизвестная сущность" }, { status: 404 })

    const wb = new ExcelJS.Workbook()
    wb.creator = "OneStep CRM"
    const name = await exporter(wb)
    const buffer = await wb.xlsx.writeBuffer()
    const today = fmtDate(new Date())
    return xlsxResponse(buffer, `${name} ${today}.xlsx`)
}
