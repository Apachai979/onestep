import prisma from "@/lib/client"
import { crmDayEnd, crmDayStart } from "./datetime"

// Выборка для отчёта «Задачи менеджеров». Отдельно от tasks-report.js, чтобы
// расчёт оставался чистой функцией и не тянул за собой prisma.
//
// Тянем задачи, попавшие в период хотя бы по одной из трёх дат: closedAt (что
// сделано), endAt (что было запланировано) и createdAt (что поставлено). Одним
// условием тут не обойтись — оси разные, и задача из марта, закрытая в апреле,
// нужна в обоих отчётах. Разбор, какая задача в какую ось попала, делает
// buildTasksReport: в SQL это вылилось бы в три запроса и склейку.
//
// Границы разворачиваем через crmDayStart/crmDayEnd: пользователь выбирает
// московские сутки, а в базе лежат UTC-моменты, и без этого «по 31 марта»
// отрезало бы вечерние закрытия последнего дня.
const TASK_USER_SELECT = {
    id: true,
    firstName: true,
    lastName: true,
    email: true,
    position: true,
}

export async function loadTasksReportData({ from, to }) {
    const start = crmDayStart(from)
    const end = crmDayEnd(to)
    if (!start || !end) return { tasks: [] }

    const range = { gte: start, lte: end }

    const tasks = await prisma.task.findMany({
        where: {
            OR: [{ closedAt: range }, { endAt: range }, { createdAt: range }],
        },
        orderBy: { endAt: "asc" },
        select: {
            id: true,
            title: true,
            // Описание нужно целиком: в истории отчёта тема, суть и итог задачи
            // читаются подряд, и обрезанная середина ломает смысл.
            description: true,
            type: true,
            status: true,
            result: true,
            allDay: true,
            startAt: true,
            endAt: true,
            closedAt: true,
            createdAt: true,
            assignee: { select: TASK_USER_SELECT },
            createdBy: { select: TASK_USER_SELECT },
            deal: {
                select: {
                    id: true,
                    title: true,
                    counterparty: { select: { id: true, name: true } },
                    sourceProject: { select: { internalName: true } },
                },
            },
            project: { select: { id: true, internalName: true } },
            distributor: { select: { id: true, name: true } },
            endCustomer: { select: { id: true, name: true } },
        },
    })

    return { tasks }
}
