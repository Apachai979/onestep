import ExcelJS from "exceljs"
import prisma from "@/lib/client"
import { requireCrmSession } from "@/lib/crm/session"
import { DEAL_LOSS_REASON_LABELS, DEAL_STATUS_LABELS, DEAL_STATUSES } from "@/lib/crm/deal"
import {
    ACTIVITY_AREA_LABELS,
    COMPANY_KIND_LABELS,
    COUNTERPARTY_SOURCE_LABELS,
    COUNTERPARTY_TYPE_LABELS,
} from "@/lib/crm/counterparty"
import {
    PROJECT_LOSS_REASON_LABELS,
    PROJECT_STATUS_LABELS,
    buildInternalName,
} from "@/lib/crm/project"
import {
    cellBool,
    cellDate,
    cellInt,
    cellNum,
    cellStr,
    labelToKey,
    sheetToObjects,
} from "@/lib/crm/excel"

const MAX_ERRORS = 50

// В LABELS остались устаревшие ключи статусов проекта (WON/LOST/CANCELLED) —
// при импорте их нужно сохранять как есть, а не подменять на IN_PROGRESS.
const PROJECT_STATUS_KEYS = Object.keys(PROJECT_STATUS_LABELS)

function decStr(v) {
    const n = cellNum(v)
    return n === null ? null : String(n)
}

// Индексы существующих контрагентов для поиска по ИНН/КПП/названию.
async function counterpartyIndex(tx) {
    const all = await tx.counterparty.findMany({
        select: { id: true, name: true, inn: true, kpp: true },
    })
    const byName = new Map()
    const byInnKpp = new Map()
    const byInnNoKpp = new Map()
    const byAnyInn = new Map()

    const put = (inn, kpp, name, id) => {
        const i = String(inn || "").trim()
        const k = String(kpp || "").trim()
        byName.set(String(name || "").trim().toLowerCase(), { id, inn: i })
        if (!i) return
        if (!byAnyInn.has(i)) byAnyInn.set(i, id)
        if (k) byInnKpp.set(`${i}|${k}`, id)
        else byInnNoKpp.set(i, id)
    }
    for (const c of all) put(c.inn, c.kpp, c.name, c.id)

    // Совпадение по названию принимаем, только если ИНН не противоречит.
    const byNameSafe = (name, inn) => {
        const rec = byName.get(String(name || "").trim().toLowerCase())
        if (!rec) return null
        if (inn && rec.inn && rec.inn !== inn) return null
        return rec.id
    }

    return {
        find(inn, kpp, name) {
            const i = String(inn || "").trim()
            const k = String(kpp || "").trim()
            if (i && k) {
                // Пара ИНН+КПП однозначно определяет юрлицо: у головной
                // организации и филиалов ИНН общий, а КПП разные.
                const exact = byInnKpp.get(`${i}|${k}`)
                if (exact) return exact
                // Запись с тем же ИНН и пустым КПП — та же организация,
                // заведённая руками без реквизитов.
                const noKpp = byInnNoKpp.get(i)
                if (noKpp) return noKpp
                return byNameSafe(name, i)
            }
            // КПП неизвестен (в листах сделок и проектов его нет): название
            // точнее, чем общий для филиалов ИНН.
            const byNameHit = byNameSafe(name, i)
            if (byNameHit) return byNameHit
            return i ? byAnyInn.get(i) || null : null
        },
        add: put,
    }
}

async function userByEmailIndex(tx) {
    const users = await tx.user.findMany({ select: { id: true, email: true } })
    const map = new Map(users.map(u => [u.email.toLowerCase(), u.id]))
    // Значение приходит сырой ячейкой: Excel превращает email в гиперссылку,
    // и без cellStr сюда прилетает объект вместо строки.
    return cell => map.get(cellStr(cell).toLowerCase()) || null
}

// Артикул → id товара, чтобы импортированные позиции не отрывались от каталога.
async function productBySkuIndex(tx) {
    const products = await tx.product.findMany({ select: { id: true, sku: true } })
    const map = new Map(products.map(p => [p.sku.trim().toLowerCase(), p.id]))
    return sku => map.get(String(sku || "").trim().toLowerCase()) || null
}

// Контакт контрагента по email, иначе по «Фамилия Имя».
async function contactIndex(tx) {
    const contacts = await tx.contact.findMany({
        select: { id: true, counterpartyId: true, email: true, firstName: true, lastName: true },
    })
    const byEmail = new Map()
    const byName = new Map()
    for (const c of contacts) {
        if (!c.counterpartyId) continue
        const email = (c.email || "").trim().toLowerCase()
        if (email) byEmail.set(`${c.counterpartyId}|${email}`, c.id)
        const name = [c.lastName, c.firstName].filter(Boolean).join(" ").trim().toLowerCase()
        if (name) byName.set(`${c.counterpartyId}|${name}`, c.id)
    }
    return (cpId, emailCell, nameCell) => {
        if (!cpId) return null
        const email = cellStr(emailCell).toLowerCase()
        if (email && byEmail.has(`${cpId}|${email}`)) return byEmail.get(`${cpId}|${email}`)
        const name = cellStr(nameCell).toLowerCase()
        if (name && byName.has(`${cpId}|${name}`)) return byName.get(`${cpId}|${name}`)
        return null
    }
}

async function projectByNameIndex(tx) {
    const projects = await tx.project.findMany({ select: { id: true, internalName: true } })
    const map = new Map()
    for (const p of projects) {
        const key = p.internalName.trim().toLowerCase()
        // Внутреннее название генерируется из имён сторон и не уникально —
        // при неоднозначности связь не восстанавливаем.
        map.set(key, map.has(key) ? null : p.id)
    }
    return name => {
        const key = cellStr(name).toLowerCase()
        return key ? map.get(key) || null : null
    }
}

async function importCounterparties(tx, wb, report, session) {
    const main = sheetToObjects(wb.getWorksheet("Контрагенты") || wb.worksheets[0])
    const contactRows = sheetToObjects(wb.getWorksheet("Контакты"))
    const index = await counterpartyIndex(tx)
    const userByEmail = await userByEmailIndex(tx)
    const byN = new Map()

    for (const row of main) {
        const name = cellStr(row["название"])
        if (!name) {
            report.errors.push({ row: row.__row, sheet: "Контрагенты", message: "Пустое название" })
            continue
        }
        const inn = cellStr(row["инн"]) || null
        const kpp = cellStr(row["кпп"]) || null
        const existingId = index.find(inn, kpp, name)
        const n = cellStr(row["№"])
        if (existingId) {
            report.skipped += 1
            if (n) byN.set(n, existingId)
            continue
        }
        const rawSource = cellStr(row["источник"])
        const created = await tx.counterparty.create({
            data: {
                type:
                    labelToKey(COUNTERPARTY_TYPE_LABELS, cellStr(row["тип"])) ||
                    "END_CUSTOMER",
                name,
                region: cellStr(row["регион"]) || "—",
                city: cellStr(row["город"]) || null,
                inn,
                kpp,
                ogrn: cellStr(row["огрн"]) || null,
                okpo: cellStr(row["окпо"]) || null,
                okved: cellStr(row["оквэд"]) || null,
                phone: cellStr(row["телефон"]) || null,
                email: cellStr(row["email"]) || null,
                website: cellStr(row["веб-сайт"]) || null,
                managerId: userByEmail(row["менеджер (email)"]),
                address: cellStr(row["адрес"]) || null,
                // Источник — enum: нераспознанную подпись кладём в «Другое»,
                // иначе в базе окажется произвольный текст.
                source: rawSource
                    ? labelToKey(COUNTERPARTY_SOURCE_LABELS, rawSource, "OTHER")
                    : null,
                companyKind: labelToKey(COMPANY_KIND_LABELS, cellStr(row["тип компании"])),
                activityArea: labelToKey(
                    ACTIVITY_AREA_LABELS,
                    cellStr(row["сфера деятельности"]),
                ),
                totalRevenue: decStr(row["бюджет"]) ?? "0",
                discount: decStr(row["скидка %"]),
                bankName: cellStr(row["банк"]) || null,
                bankAccount: cellStr(row["расчётный счёт"]) || null,
                bankCorrAccount: cellStr(row["корр. счёт"]) || null,
                bik: cellStr(row["бик"]) || null,
                note: cellStr(row["примечание"]) || null,
                createdById: session.user.id,
            },
        })
        report.created += 1
        index.add(inn, kpp, name, created.id)
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
                workPhone: cellStr(row["рабочий телефон"]) || null,
                email,
                position: cellStr(row["должность"]) || null,
                birthDate: cellDate(row["дата рождения"]),
                comment: cellStr(row["комментарий"]) || null,
                isPrimary: cellBool(row["основной"]),
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
    const findContact = await contactIndex(tx)
    const findProject = await projectByNameIndex(tx)
    const productBySku = await productBySkuIndex(tx)
    const byN = new Map()

    for (const row of main) {
        const cpId = index.find(
            cellStr(row["инн клиента"]),
            cellStr(row["кпп клиента"]),
            cellStr(row["клиент"]),
        )
        if (!cpId) {
            report.errors.push({
                row: row.__row,
                sheet: "Сделки",
                message: `Клиент не найден: «${cellStr(row["клиент"]) || cellStr(row["инн клиента"]) || "?"}» — сначала импортируйте контрагентов`,
            })
            continue
        }
        const rawStatus = labelToKey(DEAL_STATUS_LABELS, cellStr(row["статус"]))
        const status = DEAL_STATUSES.includes(rawStatus) ? rawStatus : "NEGOTIATION"
        const lossReason = labelToKey(DEAL_LOSS_REASON_LABELS, cellStr(row["причина проигрыша"]))
        const isAuction = cellBool(row["аукцион"])
        const customerId = isAuction
            ? index.find(
                  cellStr(row["инн заказчика"]),
                  cellStr(row["кпп заказчика"]),
                  cellStr(row["заказчик"]),
              )
            : null
        const createdAt = cellDate(row["создана"])
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
                contactId: findContact(cpId, row["контакт (email)"], row["контакт"]),
                sourceProjectId: findProject(row["проект"]),
                managerId: userByEmail(row["менеджер (email)"]) || session.user.id,
                createdById: session.user.id,
                ...(createdAt ? { createdAt } : {}),
                // --- Аукцион ---
                isAuction,
                purchaseNumber: isAuction ? cellStr(row["номер закупки"]) || null : null,
                auctionUrl: isAuction ? cellStr(row["ссылка на закупку"]) || null : null,
                nmck: isAuction ? decStr(row["нмцк"]) ?? "0" : "0",
                auctionCustomerId: customerId,
                auctionCustomerContactId: customerId
                    ? findContact(
                          customerId,
                          row["контакт заказчика (email)"],
                          row["контакт заказчика"],
                      )
                    : null,
                bidsDeadlineAt: isAuction ? cellDate(row["приём заявок до"]) : null,
                auctionAt: isAuction ? cellDate(row["дата аукциона"]) : null,
                resultsAt: isAuction ? cellDate(row["подведение итогов"]) : null,
                participantsCount: isAuction ? cellInt(row["участников"]) : null,
                bidsCount: isAuction ? cellInt(row["заявок"]) : null,
                winner: isAuction ? cellStr(row["победитель"]) || null : null,
            },
        })
        report.created += 1
        if (isAuction && !customerId && cellStr(row["заказчик"])) {
            report.errors.push({
                row: row.__row,
                sheet: "Сделки",
                message: `Заказчик аукциона не найден: «${cellStr(row["заказчик"])}» — сделка создана без него`,
            })
        }
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
        const sku = cellStr(row["артикул"]) || null
        await tx.dealItem.create({
            data: {
                dealId,
                sku,
                productId: productBySku(sku),
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
    const productBySku = await productBySkuIndex(tx)
    const byN = new Map()

    for (const row of main) {
        const distId = index.find(
            cellStr(row["инн дистрибьютора"]),
            cellStr(row["кпп дистрибьютора"]),
            cellStr(row["дистрибьютор"]),
        )
        const custId = index.find(
            cellStr(row["инн потребителя"]),
            cellStr(row["кпп потребителя"]),
            cellStr(row["потребитель"]),
        )
        if (!distId || !custId) {
            report.errors.push({
                row: row.__row,
                sheet: "Проекты",
                message: `${!distId ? "Дистрибьютор" : "Потребитель"} не найден — сначала импортируйте контрагентов`,
            })
            continue
        }
        const rawStatus = labelToKey(PROJECT_STATUS_LABELS, cellStr(row["статус"]))
        const status = PROJECT_STATUS_KEYS.includes(rawStatus) ? rawStatus : "IN_PROGRESS"
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
                internalName,
                status,
                totalAmount: decStr(row["сумма проекта"]) ?? "0",
                discount: decStr(row["скидка %"]),
                externalAuctionId: cellStr(row["№ закупки"]) || null,
                auctionDate: cellDate(row["дата аукциона"]),
                lossReason: labelToKey(
                    PROJECT_LOSS_REASON_LABELS,
                    cellStr(row["причина проигрыша"]),
                ),
                lossComment: cellStr(row["комментарий к проигрышу"]) || null,
                duplicateComment: cellStr(row["комментарий к дублю"]) || null,
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
        const sku = cellStr(row["артикул"]) || null
        await tx.projectItem.create({
            data: {
                projectId,
                sku,
                productId: productBySku(sku),
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
