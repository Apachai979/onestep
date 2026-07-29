// Удаление «хвостов» карточки.
//
// Заметки и вложения привязаны полиморфно (entityType + entityId), внешнего
// ключа у них нет — Prisma такие связи не каскадит, и после удаления проекта
// или сделки они остались бы висеть на несуществующем id. Задачи привязаны
// обычным FK с onDelete: SetNull, то есть тоже пережили бы карточку, но уже
// без контекста.
//
// Файлы вложений лежат на диске: их ключи собираем внутри транзакции, а сами
// файлы удаляем после коммита — если транзакция откатится, файлы должны
// остаться на месте.

import { deleteFile } from "@/lib/crm/storage/local"

/**
 * Снимает заметки и вложения одной сущности. Вызывать внутри транзакции.
 * Возвращает storageKey удалённых вложений.
 */
export async function deleteEntityTail(tx, entityType, entityId) {
    const notes = await tx.note.findMany({
        where: { entityType, entityId },
        select: { id: true },
    })
    const noteIds = notes.map(n => n.id)

    // Вложения бывают двух видов: прикреплённые к карточке напрямую и
    // приложенные к заметке (noteId). Вторые ушли бы каскадом от Note, но
    // тогда мы не узнали бы их storageKey — собираем оба вида заранее.
    const where = [{ entityType, entityId }]
    if (noteIds.length > 0) where.push({ noteId: { in: noteIds } })

    const attachments = await tx.attachment.findMany({
        where: { OR: where },
        select: { id: true, storageKey: true },
    })

    if (attachments.length > 0) {
        await tx.attachment.deleteMany({ where: { id: { in: attachments.map(a => a.id) } } })
    }
    if (noteIds.length > 0) {
        await tx.note.deleteMany({ where: { id: { in: noteIds } } })
    }

    return attachments.map(a => a.storageKey).filter(Boolean)
}

/**
 * То же самое для набора сущностей одного типа (например, отгрузок сделки,
 * которые уедут каскадом вместе с ней).
 */
export async function deleteEntityTails(tx, entityType, entityIds) {
    const keys = []
    for (const id of entityIds) {
        keys.push(...(await deleteEntityTail(tx, entityType, id)))
    }
    return keys
}

/**
 * Задачи, которые держатся только на удаляемой карточке, удаляем: без неё
 * задача теряет смысл. Задачу, привязанную ещё и ко второй карточке (сделка
 * из проекта), оставляем — FK обнулит только удаляемую сторону.
 */
export async function deleteOrphanTasks(tx, { projectId, dealId }) {
    if (projectId) {
        await tx.task.deleteMany({ where: { projectId, dealId: null } })
    }
    if (dealId) {
        await tx.task.deleteMany({ where: { dealId, projectId: null } })
    }
}

/** Удаляет файлы с диска. Вызывать после коммита транзакции. */
export async function removeStoredFiles(storageKeys) {
    for (const key of storageKeys) {
        // Отсутствующий файл deleteFile проглатывает сам; остальные ошибки
        // (права, диск) не должны выглядеть как неудавшееся удаление карточки —
        // в БД её уже нет.
        try {
            await deleteFile(key)
        } catch (err) {
            console.error("Не удалось удалить файл вложения", key, err)
        }
    }
}
