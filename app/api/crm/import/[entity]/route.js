import ExcelJS from "exceljs"
import prisma from "@/lib/client"
import { requireCrmSession } from "@/lib/crm/session"
import { DEAL_LOSS_REASON_LABELS, DEAL_STATUS_LABELS } from "@/lib/crm/deal"
import {
    PROJECT_LOSS_REASON_LABELS,
    PROJECT_STATUS_LABELS,
    buildInternalName,
} from "@/lib/crm/project"
import { cellDate, cellNum, cellStr, labelToKey, sheetToObjects } from "@/lib/crm/excel"

const CP_TYPE_LABELS = {
    DISTRIBUTOR: "Дистрибьютор",
    END_CUSTOMER: "Конечный потребитель",
}

const MAX_ERRORS = 50

function decStr(v) {
    const n = cellNum(v)
    return n === null ? null : String(n)
}

// Индексы существующих контрагентов для поиска по ИНН/названию.
async function counterpartyIndex(tx) {
    const all = await tx.counterparty.findMany({
        select: { id: true, name: true, inn: true },
    })
    const byInn = new Map()
    const byName = new Map()
    for (const c of all) {
        if (c.inn) byInn.set(c.inn.trim(), c.id)
        byName.set(c.name.trim().toLowerCase(), c.id)
    }
    return {
        // Сначала точное совпадение названия: ИНН может быть общим у головной
        // организации и филиалов, и тогда матч по ИНН неоднозначен.
        find(inn, name) {
            const n = String(name || "").trim().toLowerCase()
            if (n && byName.has(n)) return byName.get(n)
            const i = String(inn || "").trim()
            if (i && byInn.has(i)) return byInn.get(i)
            return null
        },
        add(inn, name, id) {
            const i = String(inn || "").trim()
            if (i) byInn.set(i, id)
            byName.set(String(name || "").trim().toLowerCase(), id)
        },
    }
}

async function userByEmailIndex(tx) {
    const users = await tx.user.findMany({ select: { id: true, email: true } })
    const map = new Map(users.map(u => [u.email.toLowerCase(), u.id]))
    return email => map.get(String(email || "").trim().toLowerCase()) || null
}

async function importCounterparties(tx, wb, report, session) {
    const main = sheetToObjects(wb.getWorksheet("Контрагенты") || wb.worksheets[0])
    const contactRows = sheetToObjects(wb.getWorksheet("Контакты"))
    const index = await counterpartyIndex(tx)
    const byN = new Map()

    for (const row of main) {
        const name = cellStr(row["название"])
        if (!name) {
            report.errors.push({ row: row.__row, sheet: "Контрагенты", message: "Пустое название" })
            continue
        }
        const inn = cellStr(row["инн"]) || null
        const existingId = index.find(inn, name)
        const n = cellStr(row["№"])
        if (existingId) {
            report.skipped += 1
            if (n) byN.set(n, existingId)
            continue
        }
        const created = await tx.counterparty.create({
            data: {
                type:
                    labelToKey(CP_TYPE_LABELS, cellStr(row["тип"])) || "END_CUSTOMER",
                name,
                region: cellStr(row["регион"]) || "—",
                inn,
                kpp: cellStr(row["кпп"]) || null,
                ogrn: cellStr(row["огрн"]) || null,
                phone: cellStr(row["телефон"]) || null,
                email: cellStr(row["email"]) || null,
                address: cellStr(row["адрес"]) || null,
                source: cellStr(row["источник"]) || "Импорт из Excel",
                discount: decStr(row["скидка %"]),
                note: cellStr(row["примечание"]) || null,
                createdById: session.user.id,
            },
        })
        report.created += 1
        index.add(inn, name, created.id)
        if (n) byN.set(n, created.id)
    }

    for (const row of contactRows) {
        const n = cellStr(row["№ контрагента"])
        const cpId = byN.get(n)
        if (!cpId) {
            report.errors.push({
                row: row.__row,
                sheet: "Контакты",
                message: `Контрагент № ${n || "?"} не найден в листе «Контрагенты»`,
            })
            continue
        }
        const firstName = cellStr(row["имя"]) || null
        const lastName = cellStr(row["фамилия"]) || null
        const phone = cellStr(row["телефон"]) || null
        const email = cellStr(row["email"]) || null
        if (!firstName && !lastName && !phone && !email) continue
        // Не плодим дубли при повторном импорте: сравнение с нормализацией,
        // т.к. в старых данных пустые поля могут храниться как "" вместо null.
        const norm = v => (v || "").trim().toLowerCase()
        const existingContacts = await tx.contact.findMany({
            where: { counterpartyId: cpId },
            select: { firstName: true, lastName: true, phone: true, email: true },
        })
        const dup = existingContacts.some(
            c =>
                norm(c.firstName) === norm(firstName) &&
                norm(c.lastName) === norm(lastName) &&
                norm(c.phone) === norm(phone) &&
                norm(c.email) === norm(email),
        )
        if (dup) continue
        await tx.contact.create({
            data: {
                counterpartyId: cpId,
                firstName,
                lastName,
                phone,
                email,
                position: cellStr(row["должность"]) || null,
                isPrimary: cellStr(row["основной"]).toLowerCase() === "да",
            },
        })
        report.contacts += 1
    }
}

async function importDeals(tx, wb, report, session) {
    const main = sheetToObjects(wb.getWorksheet("Сделки") || wb.worksheets[0])
    const itemRows = sheetToObjects(wb.getWorksheet("Позиции"))
    const index = await counterpartyIndex(tx)
    const userByEmail = await userByEmailIndex(tx)
    const byN = new Map()

    for (const row of main) {
        const cpId = index.find(cellStr(row["инн клиента"]), cellStr(row["клиент"]))
        if (!cpId) {
            report.errors.push({
                row: row.__row,
                sheet: "Сделки",
                message: `Клиент не найден: «${cellStr(row["клиент"]) || cellStr(row["инн клиента"]) || "?"}» — сначала импортируйте контрагентов`,
            })
            continue
        }
        const status =
            labelToKey(DEAL_STATUS_LABELS, cellStr(row["статус"])) || "NEGOTIATION"
        const lossReason = labelToKey(DEAL_LOSS_REASON_LABELS, cellStr(row["причина проигрыша"]))
        const created = await tx.deal.create({
            data: {
                title: cellStr(row["название"]) || null,
                status,
                totalAmount: decStr(row["сумма"]) ?? "0",
                discount: decStr(row["скидка %"]),
                note: cellStr(row["примечание"]) || null,
                deliveryAddress: cellStr(row["адрес доставки"]) || null,
                lossReason: status === "CANCELLED" ? lossReason || "OTHER" : null,
                lossComment:
                    status === "CANCELLED"
                        ? cellStr(row["комментарий к проигрышу"]) || null
                        : null,
                counterpartyId: cpId,
                managerId: userByEmail(row["менеджер (email)"]) || session.user.id,
                createdById: session.user.id,
            },
        })
        report.created += 1
        const n = cellStr(row["№"])
        if (n) byN.set(n, created.id)
    }

    for (const row of itemRows) {
        const n = cellStr(row["№ сделки"])
        const dealId = byN.get(n)
        if (!dealId) {
            report.errors.push({
                row: row.__row,
                sheet: "Позиции",
                message: `Сделка № ${n || "?"} не найдена в листе «Сделки»`,
            })
            continue
        }
        const name = cellStr(row["наименование"])
        if (!name) continue
        await tx.dealItem.create({
            data: {
                dealId,
                sku: cellStr(row["артикул"]) || null,
                name,
                quantity: decStr(row["кол-во"]) ?? "1",
                amount: decStr(row["сумма"]) ?? "0",
            },
        })
        report.items += 1
    }
}

async function importProjects(tx, wb, report, session) {
    const main = sheetToObjects(wb.getWorksheet("Проекты") || wb.worksheets[0])
    const itemRows = sheetToObjects(wb.getWorksheet("Позиции"))
    const index = await counterpartyIndex(tx)
    const userByEmail = await userByEmailIndex(tx)
    const byN = new Map()

    for (const row of main) {
        const auction = cellStr(row["аукцион"])
        if (!auction) {
            report.errors.push({ row: row.__row, sheet: "Проекты", message: "Пустой идентификатор аукциона" })
            continue
        }
        const distId = index.find(cellStr(row["инн дистрибьютора"]), cellStr(row["дистрибьютор"]))
        const custId = index.find(cellStr(row["инн потребителя"]), cellStr(row["потребитель"]))
        if (!distId || !custId) {
            report.errors.push({
                row: row.__row,
                sheet: "Проекты",
                message: `${!distId ? "Дистрибьютор" : "Потребитель"} не найден — сначала импортируйте контрагентов`,
            })
            continue
        }
        const status =
            labelToKey(PROJECT_STATUS_LABELS, cellStr(row["статус"])) || "IN_PROGRESS"
        const lossReason = labelToKey(
            PROJECT_LOSS_REASON_LABELS,
            cellStr(row["причина проигрыша"]),
        )
        let internalName = cellStr(row["внутреннее название"])
        if (!internalName) {
            const [d, c] = await Promise.all([
                tx.counterparty.findUnique({ where: { id: distId }, select: { name: true } }),
                tx.counterparty.findUnique({ where: { id: custId }, select: { name: true } }),
            ])
            internalName = buildInternalName(d?.name, c?.name)
        }
        const created = await tx.project.create({
            data: {
                externalAuctionId: auction,
                internalName,
                status,
                totalAmount: decStr(row["сумма"]) ?? "0",
                auctionDate: cellDate(row["дата аукциона"]),
                lossReason: status === "LOST" ? lossReason || "OTHER" : null,
                lossComment:
                    status === "LOST"
                        ? cellStr(row["комментарий к проигрышу"]) || null
                        : null,
                distributorId: distId,
                endCustomerId: custId,
                managerId: userByEmail(row["менеджер (email)"]) || session.user.id,
            },
        })
        report.created += 1
        const n = cellStr(row["№"])
        if (n) byN.set(n, created.id)
    }

    for (const row of itemRows) {
        const n = cellStr(row["№ проекта"])
        const projectId = byN.get(n)
        if (!projectId) {
            report.errors.push({
                row: row.__row,
                sheet: "Позиции",
                message: `Проект № ${n || "?"} не найден в листе «Проекты»`,
            })
            continue
        }
        const name = cellStr(row["наименование"])
        if (!name) continue
        await tx.projectItem.create({
            data: {
                projectId,
                sku: cellStr(row["артикул"]) || null,
                name,
                quantity: decStr(row["кол-во"]) ?? "1",
                amount: decStr(row["сумма"]) ?? "0",
            },
        })
        report.items += 1
    }
}

const IMPORTERS = {
    counterparties: importCounterparties,
    deals: importDeals,
    projects: importProjects,
}

export async function POST(request, { params }) {
    const { session, response } = await requireCrmSession()
    if (!session) return response
    if (session.user.role !== "ADMIN") {
        return Response.json({ error: "Импорт доступен только администратору" }, { status: 403 })
    }

    const importer = IMPORTERS[params.entity]
    if (!importer) return Response.json({ error: "Неизвестная сущность" }, { status: 404 })

    let form
    try {
        form = await request.formData()
    } catch {
        return Response.json({ error: "Ожидается multipart/form-data" }, { status: 400 })
    }
    const file = form.get("file")
    if (!file || typeof file === "string") {
        return Response.json({ error: "Файл не получен" }, { status: 400 })
    }

    const wb = new ExcelJS.Workbook()
    try {
        await wb.xlsx.load(Buffer.from(await file.arrayBuffer()))
    } catch {
        return Response.json(
            { error: "Не удалось прочитать файл — ожидается .xlsx" },
            { status: 400 },
        )
    }

    const report = { created: 0, skipped: 0, contacts: 0, items: 0, errors: [] }
    try {
        await prisma.$transaction(
            async tx => {
                await importer(tx, wb, report, session)
            },
            { timeout: 120_000 },
        )
    } catch (err) {
        console.error("[import]", err)
        return Response.json(
            { error: `Импорт прерван: ${err.message}. Данные не сохранены.` },
            { status: 500 },
        )
    }

    report.errors = report.errors.slice(0, MAX_ERRORS)
    return Response.json(report)
}
