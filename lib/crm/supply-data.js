import prisma from "@/lib/client"
import { SUPPLY_DEAL_STATUSES } from "./supply"

// Выборка для отчёта «Обеспечение»: справочник с остатками и сделки с
// обещанным товаром. Отдельно от supply.js, чтобы расчёт оставался чистым и
// не тянул за собой prisma.
//
// Позиции грузим вместе с их строками отгрузок: нужен статус документа —
// проведённое вычитается из потребности, черновики нет (см. buildSupplyReport).
export async function loadSupplyData() {
    const [products, deals] = await Promise.all([
        prisma.product.findMany({
            orderBy: { sku: "asc" },
            select: {
                id: true,
                sku: true,
                name: true,
                category: true,
                stocks: { select: { warehouse: true, quantity: true, syncedAt: true } },
            },
        }),
        prisma.deal.findMany({
            where: { status: { in: SUPPLY_DEAL_STATUSES } },
            select: {
                id: true,
                title: true,
                status: true,
                discount: true,
                counterparty: { select: { id: true, name: true, inn: true } },
                sourceProject: { select: { internalName: true } },
                items: {
                    select: {
                        id: true,
                        productId: true,
                        sku: true,
                        name: true,
                        quantity: true,
                        amount: true,
                        shipmentItems: {
                            select: { quantity: true, shipment: { select: { status: true } } },
                        },
                    },
                },
            },
        }),
    ])
    return { products, deals }
}
