import prisma from "@/lib/client"
import { requireCrmSession } from "@/lib/crm/session"
import {
    DEAL_STATUS_LABELS,
    dealDisplayTitle,
    dealDiscountedTotal,
} from "@/lib/crm/deal"
import { formatMoney } from "@/lib/crm/format"

const LIMIT = 7

// Глобальный поиск по CRM: контрагенты, контакты, сделки, проекты.
// Фильтрация выполняется в JS: LIKE в SQLite регистрозависим для кириллицы,
// а объёмы данных (сотни записей) позволяют дешёвый полный проход.
export async function GET(request) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    const { searchParams } = new URL(request.url)
    const q = (searchParams.get("q") || "").trim().toLowerCase()
    if (q.length < 2) {
        return Response.json({ counterparties: [], contacts: [], deals: [], projects: [] })
    }

    const has = (...vals) => vals.some(v => (v || "").toLowerCase().includes(q))

    const [cps, contacts, deals, projects] = await Promise.all([
        prisma.counterparty.findMany({
            select: {
                id: true,
                name: true,
                type: true,
                region: true,
                inn: true,
                phone: true,
                email: true,
            },
        }),
        prisma.contact.findMany({
            select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
                email: true,
                position: true,
                counterpartyId: true,
                counterparty: { select: { name: true } },
            },
        }),
        prisma.deal.findMany({
            select: {
                id: true,
                title: true,
                status: true,
                totalAmount: true,
                discount: true,
                createdAt: true,
                counterparty: { select: { name: true } },
                // Сделке из проекта название даёт проект — см. dealDisplayTitle.
                sourceProject: { select: { internalName: true } },
            },
        }),
        prisma.project.findMany({
            select: {
                id: true,
                internalName: true,
                status: true,
                endCustomer: { select: { name: true } },
                distributor: { select: { name: true } },
            },
        }),
    ])

    return Response.json({
        counterparties: cps
            .filter(c => has(c.name, c.inn, c.region, c.phone, c.email))
            .slice(0, LIMIT)
            .map(c => ({
                id: c.id,
                title: c.name,
                subtitle: [
                    c.type === "DISTRIBUTOR" ? "Дистрибьютор" : "Конечный потребитель",
                    c.region,
                    c.inn ? `ИНН ${c.inn}` : null,
                ]
                    .filter(Boolean)
                    .join(" · "),
                href: `/crm/counterparties/${c.id}`,
            })),
        contacts: contacts
            .filter(c =>
                has(
                    `${c.firstName || ""} ${c.lastName || ""}`,
                    c.phone,
                    c.email,
                    c.position,
                ),
            )
            .slice(0, LIMIT)
            .map(c => ({
                id: c.id,
                title:
                    `${c.firstName || ""} ${c.lastName || ""}`.trim() ||
                    c.email ||
                    c.phone ||
                    "Контакт",
                subtitle: [c.counterparty?.name, c.phone, c.email]
                    .filter(Boolean)
                    .join(" · "),
                href: `/crm/counterparties/${c.counterpartyId}`,
            })),
        deals: deals
            .filter(d =>
                has(d.title, d.counterparty?.name, d.sourceProject?.internalName),
            )
            .slice(0, LIMIT)
            .map(d => ({
                id: d.id,
                title: dealDisplayTitle(d, d.counterparty?.name),
                // Сделки по одному проекту называются одинаково — различить их в
                // выдаче помогают статус, сумма и дата. Клиента у них не
                // показываем: он всегда дистрибьютор проекта, названного в
                // заголовке, и только занимает место.
                subtitle: [
                    d.sourceProject ? null : d.counterparty?.name,
                    DEAL_STATUS_LABELS[d.status] || d.status,
                    formatMoney(dealDiscountedTotal(d)),
                    new Date(d.createdAt).toLocaleDateString("ru-RU"),
                ]
                    .filter(Boolean)
                    .join(" · "),
                href: `/crm/deals/${d.id}`,
            })),
        projects: projects
            .filter(p =>
                has(p.internalName, p.endCustomer?.name, p.distributor?.name),
            )
            .slice(0, LIMIT)
            .map(p => ({
                id: p.id,
                title: p.internalName,
                subtitle: [p.endCustomer?.name, p.distributor?.name]
                    .filter(Boolean)
                    .join(" · "),
                href: `/crm/projects/${p.id}`,
            })),
    })
}
