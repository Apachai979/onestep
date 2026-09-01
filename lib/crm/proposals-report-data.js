import prisma from "@/lib/client"
import { crmDayEnd, crmDayStart } from "./datetime"
import { PROPOSAL_FILE_MARK } from "./proposals-report"

// Выборка для отчёта «Коммерческие предложения». Отдельно от
// proposals-report.js, чтобы расчёт оставался чистой функцией и не тянул за
// собой prisma.
//
// Следов у КП два, и лежат они в разных таблицах:
//   FILE  — Attachment сделки с именем «Коммерческое предложение № … от …»
//           (кнопка «Сохранить в документы сделки» и копия отправленного PDF);
//   EMAIL — ChangeLog entityType="Email" (отправка КП клиенту письмом).
// Других записей с entityType="Email" в CRM нет — письмо пишет только роут
// /api/crm/deals/[id]/proposal/send, поэтому отбирать их дополнительно не по
// чему и не нужно.
//
// Границы разворачиваем через crmDayStart/crmDayEnd: менеджер выбирает
// московские сутки, а в базе лежат UTC-моменты, и без этого «по 31 августа»
// отрезало бы вечерние КП последнего дня.

const AUTHOR_SELECT = {
    select: { id: true, firstName: true, lastName: true, email: true },
}

export async function loadProposalsReportData({ from, to }) {
    const start = crmDayStart(from)
    const end = crmDayEnd(to)
    if (!start || !end) return { traces: [], deals: [] }

    const [files, emails] = await Promise.all([
        prisma.attachment.findMany({
            // Отбор по имени файла — единственный признак КП: своего поля у
            // вложения нет. startsWith, а не contains: «Коммерческое
            // предложение» в имени присланного клиентом документа не должно
            // превращать его в наше КП.
            where: {
                entityType: "Deal",
                fileName: { startsWith: PROPOSAL_FILE_MARK },
                createdAt: { gte: start, lte: end },
            },
            select: {
                id: true,
                fileName: true,
                // Тип нужен ссылке в реестре: PDF открывается вкладкой,
                // остальное скачивается — решает attachmentLinkProps.
                mimeType: true,
                entityId: true,
                createdAt: true,
                uploadedBy: AUTHOR_SELECT,
            },
        }),
        prisma.changeLog.findMany({
            where: {
                entityType: "Email",
                parentEntityType: "Deal",
                createdAt: { gte: start, lte: end },
            },
            select: {
                id: true,
                parentEntityId: true,
                changes: true,
                createdAt: true,
                author: AUTHOR_SELECT,
            },
        }),
    ])

    const traces = [
        ...files.map(f => ({
            kind: "FILE",
            id: f.id,
            dealId: f.entityId,
            at: f.createdAt,
            fileName: f.fileName,
            mimeType: f.mimeType,
            author: f.uploadedBy,
        })),
        ...emails.map(e => {
            const payload = safeJson(e.changes) || {}
            return {
                kind: "EMAIL",
                id: e.id,
                dealId: e.parentEntityId,
                at: e.createdAt,
                number: payload.number || "",
                // Адрес в payload — строка «Кому» письма, в ней может быть
                // несколько получателей через запятую.
                to: String(payload.to || "")
                    .split(/[,;]/)
                    .map(s => s.trim())
                    .filter(Boolean),
                subject: payload.subject || "",
                author: e.author,
            }
        }),
    ]

    const dealIds = [...new Set(traces.map(t => t.dealId).filter(Boolean))]
    const deals = dealIds.length
        ? await prisma.deal.findMany({
              where: { id: { in: dealIds } },
              select: {
                  id: true,
                  title: true,
                  status: true,
                  manager: AUTHOR_SELECT,
                  counterparty: { select: { id: true, name: true } },
              },
          })
        : []

    return { traces, deals }
}

// Битый JSON в журнале не должен ронять отчёт: КП всё равно попадёт в реестр,
// просто без номера — отдельной строкой.
function safeJson(text) {
    try {
        return JSON.parse(text)
    } catch {
        return null
    }
}
