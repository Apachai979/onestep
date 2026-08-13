import prisma from "@/lib/client"
import { crmDayEnd, crmDayStart } from "./datetime"
import {
    buildSalesReport,
    SALES_EXCLUDED_DEAL_STATUSES,
    SALES_SHIPMENT_STATUS,
} from "./sales"

// Выборка для отчёта «Продажи менеджеров». Отдельно от sales.js, чтобы расчёт
// оставался чистой функцией и не тянул за собой prisma.
//
// Границы периода разворачиваем через crmDayStart/crmDayEnd: пользователь
// выбирает московские сутки, а в базе лежат UTC-моменты, и без этого «по 31
// марта» отрезало бы вечерние отгрузки последнего дня.
export async function loadSalesData({ from, to }) {
    const start = crmDayStart(from)
    const end = crmDayEnd(to)
    if (!start || !end) return { shipments: [] }

    const shipments = await prisma.shipment.findMany({
        where: {
            status: SALES_SHIPMENT_STATUS,
            shippedAt: { gte: start, lte: end },
            deal: { status: { notIn: SALES_EXCLUDED_DEAL_STATUSES } },
        },
        orderBy: { shippedAt: "asc" },
        select: {
            id: true,
            number: true,
            shippedAt: true,
            createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
            deal: {
                select: {
                    id: true,
                    title: true,
                    status: true,
                    discount: true,
                    counterparty: { select: { id: true, name: true, inn: true } },
                    sourceProject: { select: { internalName: true } },
                    manager: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            position: true,
                        },
                    },
                },
            },
            items: {
                select: {
                    quantity: true,
                    dealItem: {
                        select: {
                            productId: true,
                            sku: true,
                            name: true,
                            quantity: true,
                            amount: true,
                            product: { select: { id: true, sku: true, name: true } },
                        },
                    },
                },
            },
        },
    })

    return { shipments }
}

// Сумма продаж за период без сборки полного отчёта — для строки «было / стало».
// Считаем той же выборкой и тем же расчётом, иначе прошлый период жил бы по
// своим правилам.
export async function loadSalesTotal({ from, to }) {
    const { shipments } = await loadSalesData({ from, to })
    return buildSalesReport({ shipments, from, to }).totals.amount
}
