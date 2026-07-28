import ExcelJS from "exceljs"
import prisma from "@/lib/client"
import { requireCrmSession } from "@/lib/crm/session"
import { DEAL_LOSS_REASON_LABELS, DEAL_STATUS_LABELS } from "@/lib/crm/deal"
import {
    ACTIVITY_AREA_LABELS,
    COMPANY_KIND_LABELS,
    COUNTERPARTY_SOURCE_LABELS,
    COUNTERPARTY_TYPE_LABELS,
} from "@/lib/crm/counterparty"
import { PROJECT_LOSS_REASON_LABELS, PROJECT_STATUS_LABELS } from "@/lib/crm/project"
import { fmtDate, fmtDateTime, xlsxResponse } from "@/lib/crm/excel"

function num(v) {
    const n = Number(v)
    return Number.isFinite(n) ? n : null
}

function label(map, value) {
    if (!value) return ""
    return map[value] || value
}

function contactName(c) {
    if (!c) return ""
    return [c.lastName, c.firstName].filter(Boolean).join(" ")
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
        { header: "Город", key: "city", width: 20 },
        { header: "ИНН", key: "inn", width: 14 },
        { header: "КПП", key: "kpp", width: 12 },
        { header: "ОГРН", key: "ogrn", width: 16 },
        { header: "ОКПО", key: "okpo", width: 14 },
        { header: "ОКВЭД", key: "okved", width: 12 },
        { header: "Телефон", key: "phone", width: 18 },
        { header: "Email", key: "email", width: 26 },
        { header: "Веб-сайт", key: "website", width: 26 },
        { header: "Менеджер (email)", key: "manager", width: 26 },
        { header: "Адрес", key: "address", width: 40 },
        { header: "Источник", key: "source", width: 24 },
        { header: "Тип компании", key: "companyKind", width: 28 },
        { header: "Сфера деятельности", key: "activityArea", width: 26 },
        { header: "Бюджет", key: "totalRevenue", width: 14 },
        { header: "Скидка %", key: "discount", width: 10 },
        { header: "Банк", key: "bankName", width: 30 },
        { header: "Расчётный счёт", key: "bankAccount", width: 24 },
        { header: "Корр. счёт", key: "bankCorrAccount", width: 24 },
        { header: "БИК", key: "bik", width: 12 },
        { header: "Примечание", key: "note", width: 40 },
    ])
    const wc = wb.addWorksheet("Контакты")
    setupSheet(wc, [
        { header: "№ контрагента", key: "n", width: 14 },
        { header: "Фамилия", key: "lastName", width: 18 },
        { header: "Имя", key: "firstName", width: 18 },
        { header: "Телефон", key: "phone", width: 18 },
        { header: "Рабочий телефон", key: "workPhone", width: 18 },
        { header: "Email", key: "email", width: 26 },
        { header: "Должность", key: "position", width: 22 },
        { header: "Дата рождения", key: "birthDate", width: 14 },
        { header: "Комментарий", key: "comment", width: 36 },
        { header: "Основной", key: "isPrimary", width: 10 },
    ])
    items.forEach((c, i) => {
        const n = i + 1
        ws.addRow({
            n,
            type: label(COUNTERPARTY_TYPE_LABELS, c.type),
            name: c.name,
            region: c.region,
            city: c.city || "",
            inn: c.inn || "",
            kpp: c.kpp || "",
            ogrn: c.ogrn || "",
            okpo: c.okpo || "",
            okved: c.okved || "",
            phone: c.phone || "",
            email: c.email || "",
            website: c.website || "",
            manager: c.manager?.email || "",
            address: c.address || "",
            source: label(COUNTERPARTY_SOURCE_LABELS, c.source),
            companyKind: label(COMPANY_KIND_LABELS, c.companyKind),
            activityArea: label(ACTIVITY_AREA_LABELS, c.activityArea),
            totalRevenue: num(c.totalRevenue),
            discount: num(c.discount),
            bankName: c.bankName || "",
            bankAccount: c.bankAccount || "",
            bankCorrAccount: c.bankCorrAccount || "",
            bik: c.bik || "",
            note: c.note || "",
        })
        for (const ct of c.contacts) {
            wc.addRow({
                n,
                lastName: ct.lastName || "",
                firstName: ct.firstName || "",
                phone: ct.phone || "",
                workPhone: ct.workPhone || "",
                email: ct.email || "",
                position: ct.position || "",
                birthDate: fmtDate(ct.birthDate),
                comment: ct.comment || "",
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
            counterparty: { select: { name: true, inn: true, kpp: true } },
            contact: { select: { firstName: true, lastName: true, email: true } },
            auctionCustomer: { select: { name: true, inn: true, kpp: true } },
            auctionCustomerContact: {
                select: { firstName: true, lastName: true, email: true },
            },
            sourceProject: { select: { internalName: true } },
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
        { header: "КПП клиента", key: "kpp", width: 12 },
        { header: "Контакт", key: "contact", width: 24 },
        { header: "Контакт (email)", key: "contactEmail", width: 26 },
        { header: "Статус", key: "status", width: 24 },
        { header: "Сумма", key: "amount", width: 14 },
        { header: "Скидка %", key: "discount", width: 10 },
        { header: "Менеджер (email)", key: "manager", width: 26 },
        { header: "Адрес доставки", key: "delivery", width: 36 },
        { header: "Проект", key: "project", width: 40 },
        { header: "Примечание", key: "note", width: 36 },
        { header: "Причина проигрыша", key: "lossReason", width: 24 },
        { header: "Комментарий к проигрышу", key: "lossComment", width: 30 },
        { header: "Аукцион", key: "isAuction", width: 10 },
        { header: "Номер закупки", key: "purchaseNumber", width: 22 },
        { header: "Ссылка на закупку", key: "auctionUrl", width: 36 },
        { header: "НМЦК", key: "nmck", width: 14 },
        { header: "Заказчик", key: "customer", width: 36 },
        { header: "ИНН заказчика", key: "customerInn", width: 14 },
        { header: "КПП заказчика", key: "customerKpp", width: 12 },
        { header: "Контакт заказчика", key: "customerContact", width: 24 },
        { header: "Контакт заказчика (email)", key: "customerContactEmail", width: 26 },
        { header: "Приём заявок до", key: "bidsDeadlineAt", width: 18 },
        { header: "Дата аукциона", key: "auctionAt", width: 18 },
        { header: "Подведение итогов", key: "resultsAt", width: 18 },
        { header: "Участников", key: "participantsCount", width: 12 },
        { header: "Заявок", key: "bidsCount", width: 10 },
        { header: "Победитель", key: "winner", width: 30 },
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
            kpp: d.counterparty?.kpp || "",
            contact: contactName(d.contact),
            contactEmail: d.contact?.email || "",
            status: label(DEAL_STATUS_LABELS, d.status),
            amount: num(d.totalAmount),
            discount: num(d.discount),
            manager: d.manager?.email || "",
            delivery: d.deliveryAddress || "",
            project: d.sourceProject?.internalName || "",
            note: d.note || "",
            lossReason: label(DEAL_LOSS_REASON_LABELS, d.lossReason),
            lossComment: d.lossComment || "",
            isAuction: d.isAuction ? "Да" : "",
            purchaseNumber: d.purchaseNumber || "",
            auctionUrl: d.auctionUrl || "",
            nmck: num(d.nmck),
            customer: d.auctionCustomer?.name || "",
            customerInn: d.auctionCustomer?.inn || "",
            customerKpp: d.auctionCustomer?.kpp || "",
            customerContact: contactName(d.auctionCustomerContact),
            customerContactEmail: d.auctionCustomerContact?.email || "",
            bidsDeadlineAt: fmtDateTime(d.bidsDeadlineAt),
            auctionAt: fmtDateTime(d.auctionAt),
            resultsAt: fmtDateTime(d.resultsAt),
            participantsCount: d.participantsCount ?? null,
            bidsCount: d.bidsCount ?? null,
            winner: d.winner || "",
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
            distributor: { select: { name: true, inn: true, kpp: true } },
            endCustomer: { select: { name: true, inn: true, kpp: true } },
            manager: { select: { email: true } },
            items: { orderBy: { createdAt: "asc" } },
        },
    })
    // Справочная колонка: сумма привязанных сделок (при импорте игнорируется).
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
        { header: "Сумма проекта", key: "amount", width: 14 },
        { header: "Сумма связанных сделок", key: "dealsAmount", width: 20 },
        { header: "Дистрибьютор", key: "dist", width: 36 },
        { header: "ИНН дистрибьютора", key: "distInn", width: 16 },
        { header: "КПП дистрибьютора", key: "distKpp", width: 16 },
        { header: "Потребитель", key: "cust", width: 36 },
        { header: "ИНН потребителя", key: "custInn", width: 16 },
        { header: "КПП потребителя", key: "custKpp", width: 16 },
        { header: "Менеджер (email)", key: "manager", width: 26 },
        { header: "№ закупки", key: "externalAuctionId", width: 22 },
        { header: "Дата аукциона", key: "auctionDate", width: 14 },
        { header: "Причина проигрыша", key: "lossReason", width: 26 },
        { header: "Комментарий к проигрышу", key: "lossComment", width: 30 },
        { header: "Комментарий к дублю", key: "duplicateComment", width: 30 },
    ])
    const wi = wb.addWorksheet("Позиции")
    setupSheet(wi, [
        { header: "№ проекта", key: "n", width: 10 },
        { header: "Артикул", key: "sku", width: 14 },
        { header: "Наименование", key: "name", width: 44 },
        { header: "Кол-во", key: "qty", width: 10 },
        { header: "Сумма", key: "amount", width: 14 },
    ])
    items.forEach((p, i) => {
        const n = i + 1
        ws.addRow({
            n,
            title: p.internalName,
            status: label(PROJECT_STATUS_LABELS, p.status),
            amount: num(p.totalAmount),
            dealsAmount: sumMap.get(p.id) || 0,
            dist: p.distributor?.name || "",
            distInn: p.distributor?.inn || "",
            distKpp: p.distributor?.kpp || "",
            cust: p.endCustomer?.name || "",
            custInn: p.endCustomer?.inn || "",
            custKpp: p.endCustomer?.kpp || "",
            manager: p.manager?.email || "",
            externalAuctionId: p.externalAuctionId || "",
            auctionDate: fmtDate(p.auctionDate),
            lossReason: label(PROJECT_LOSS_REASON_LABELS, p.lossReason),
            lossComment: p.lossComment || "",
            duplicateComment: p.duplicateComment || "",
        })
        for (const it of p.items) {
            wi.addRow({
                n,
                sku: it.sku || "",
                name: it.name,
                qty: num(it.quantity),
                amount: num(it.amount),
            })
        }
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
