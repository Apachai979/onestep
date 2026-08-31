import { getServerSession } from "next-auth"
import { authOptions } from "@/configs/auth"
import { touchLastSeen } from "@/lib/crm/presence"

export async function requireCrmSession() {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
        return { session: null, response: Response.json({ error: "Не авторизован" }, { status: 401 }) }
    }
    const role = session.user.role
    if (role !== "MANAGER" && role !== "ADMIN") {
        return { session: null, response: Response.json({ error: "Нет доступа" }, { status: 403 }) }
    }
    // Отметка «был в CRM» для админского списка сотрудников; не ждём результата.
    touchLastSeen(session.user.id)
    return { session, response: null }
}
