import prisma from "@/lib/client"
import { requireCrmSession } from "@/lib/crm/session"
import { dealDisplayTitle } from "@/lib/crm/deal"

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
                counterparty: { select: { name: true } },
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
            .filter(d => has(d.title, d.counterparty?.name))
            .slice(0, LIMIT)
            .map(d => ({
                id: d.id,
                title: dealDisplayTitle(d, d.counterparty?.name),
                subtitle: d.counterparty?.name || "",
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
