import prisma from "@/lib/client"
import { requireCrmSession } from "@/lib/crm/session"
import { parseContactPayload } from "@/lib/crm/contact"

// Глобальный справочник контактов: список с поиском (GET) и создание с
// необязательной привязкой к контрагенту (POST).
export async function GET(request) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    const { searchParams } = new URL(request.url)
    const q = searchParams.get("q")?.trim()

    const items = await prisma.contact.findMany({
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }, { createdAt: "desc" }],
        select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
            position: true,
            isPrimary: true,
            counterparty: { select: { id: true, name: true, type: true } },
        },
    })

    // Фильтруем в JS: SQLite LIKE регистрозависим для кириллицы.
    const filtered = q
        ? items.filter(c => {
              const ql = q.toLowerCase()
              const fn = `${c.firstName ?? ""} ${c.lastName ?? ""}`.toLowerCase()
              return (
                  fn.includes(ql) ||
                  (c.phone || "").toLowerCase().includes(ql) ||
                  (c.email || "").toLowerCase().includes(ql) ||
                  (c.position || "").toLowerCase().includes(ql) ||
                  (c.counterparty?.name || "").toLowerCase().includes(ql)
              )
          })
        : items

    return Response.json({ items: filtered })
}

export async function POST(request) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    let body
    try {
        body = await request.json()
    } catch {
        return Response.json({ error: "Некорректный JSON" }, { status: 400 })
    }

    const { data, error } = parseContactPayload(body)
    if (error) return Response.json({ error }, { status: 400 })

    // Привязка к контрагенту необязательна.
    let counterpartyId = null
    if (body.counterpartyId) {
        const cp = await prisma.counterparty.findUnique({
            where: { id: body.counterpartyId },
            select: { id: true },
        })
        if (!cp) return Response.json({ error: "Контрагент не найден" }, { status: 400 })
        counterpartyId = cp.id
    }

    // «Основной» имеет смысл только при привязке к контрагенту.
    const isPrimary = counterpartyId ? !!data.isPrimary : false

    const created = await prisma.$transaction(async tx => {
        if (isPrimary) {
            await tx.contact.updateMany({
                where: { counterpartyId, isPrimary: true },
                data: { isPrimary: false },
            })
        }
        return tx.contact.create({ data: { ...data, isPrimary, counterpartyId } })
    })

    return Response.json({ item: created }, { status: 201 })
}
