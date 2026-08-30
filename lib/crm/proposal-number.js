// Номер коммерческого предложения: база от сделки + версия — XKJP/1, XKJP/2, …
// База (последние 4 символа id сделки) держит все КП одной сделки в одной
// «серии», версия отличает их друг от друга. Раньше версия была захардкожена
// единицей, и каждое следующее КП по сделке получало тот же номер и то же имя
// файла — в документах копились одноимённые PDF, которые менеджер разбирал руками.

export function proposalNumberBase(dealId) {
    return String(dealId || "")
        .slice(-4)
        .toUpperCase()
}

export function formatProposalNumber(base, version) {
    return `${base}/${version}`
}

/**
 * Версия из любой строки, где мог засветиться номер: имени файла
 * («… № XKJP/3 от 30.08.2026.pdf») или JSON-payload записи в истории.
 * Ищем подстрокой, а не разбором JSON, — формат payload у файла и письма
 * разный (fileName / number), а номер в обоих виден как есть.
 */
export function proposalVersionFrom(text, base) {
    if (!text || !base) return 0
    const m = String(text).match(new RegExp(`${base}\\s*/\\s*(\\d{1,4})`, "i"))
    return m ? Number(m[1]) : 0
}

/**
 * Следующий свободный номер КП по сделке.
 *
 * Считаем по истории изменений, а не только по текущим вложениям: удалённое
 * КП уже могло уехать клиенту письмом, и переиспользовать его номер нельзя.
 * История хранит и созданные файлы (Attachment), и отправленные письма (Email),
 * а записи из неё не удаляются.
 */
export async function nextProposalNumber(prisma, dealId) {
    const base = proposalNumberBase(dealId)
    if (!base) return formatProposalNumber(base, 1)

    const [attachments, logs] = await Promise.all([
        prisma.attachment.findMany({
            where: { entityType: "Deal", entityId: dealId },
            select: { fileName: true },
        }),
        prisma.changeLog.findMany({
            where: {
                parentEntityType: "Deal",
                parentEntityId: dealId,
                entityType: { in: ["Attachment", "Email"] },
            },
            select: { changes: true },
        }),
    ])

    let max = 0
    for (const a of attachments) max = Math.max(max, proposalVersionFrom(a.fileName, base))
    for (const l of logs) max = Math.max(max, proposalVersionFrom(l.changes, base))

    return formatProposalNumber(base, max + 1)
}

/**
 * Следующая версия для номера, который уже стоит в форме: «XKJP/2» → «XKJP/3».
 * Наращиваем хвостовое число, а не разбираем номер по базе, — менеджер мог
 * поправить его руками, и ломать его правку из-за несовпадения с шаблоном
 * не за чем. Ширина числа сохраняется («0007» → «0008»), номера без числа
 * на конце остаются как есть.
 */
export function bumpProposalNumber(number) {
    const m = String(number || "").match(/^(.*?)(\d+)$/)
    if (!m) return String(number || "")
    const next = String(Number(m[2]) + 1)
    return `${m[1]}${next.padStart(m[2].length, "0")}`
}
