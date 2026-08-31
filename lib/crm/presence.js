import prisma from "@/lib/client"

// «Когда сотрудник последний раз заходил» — это не момент ввода пароля: сессия
// на JWT живёт неделями, и у активно работающего человека дата логина была бы
// месячной давности. Поэтому отметку ставит любое обращение к CRM.
//
// Пинг намеренно дешёвый:
//  - троттлинг держим в памяти процесса (инстанс под PM2 один, база — SQLite),
//    поэтому в промежутке между записями запросов к базе нет вообще;
//  - пишем сырым UPDATE, а не prisma.user.update: у модели стоит @updatedAt, и
//    обычное обновление затирало бы «когда правили карточку» каждым переходом;
//  - результат не ждём и ошибки глотаем — просмотр списка сделок не должен
//    падать из-за отметки посещения.
export const PRESENCE_TOUCH_INTERVAL_MS = 5 * 60 * 1000

const touched = new Map()

export function touchLastSeen(userId) {
    if (!userId) return
    const now = Date.now()
    const prev = touched.get(userId)
    if (prev && now - prev < PRESENCE_TOUCH_INTERVAL_MS) return
    touched.set(userId, now)

    prisma
        .$executeRaw`UPDATE "users" SET "lastSeenAt" = ${new Date(now)} WHERE "id" = ${userId}`
        .catch(err => {
            // Не получилось — снимаем отметку, чтобы следующий запрос попробовал снова.
            touched.delete(userId)
            console.error("[presence]", err?.message || err)
        })
}
