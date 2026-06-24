import { getServerSession } from "next-auth"
import { authOptions } from "@/configs/auth"

export async function requireAdmin() {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
        return {
            session: null,
            response: Response.json({ error: "Не авторизован" }, { status: 401 }),
        }
    }
    if (session.user.role !== "ADMIN") {
        return {
            session: null,
            response: Response.json({ error: "Доступ только для администратора" }, { status: 403 }),
        }
    }
    return { session, response: null }
}
