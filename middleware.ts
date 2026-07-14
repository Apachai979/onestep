import { withAuth, type NextRequestWithAuth } from "next-auth/middleware"
import { NextResponse, type NextFetchEvent } from "next/server"

// Публичный сайт временно скрыт: всё, кроме CRM и авторизации, ведёт на /maintenance.
// Чтобы вернуть сайт — поставить false (или задать SITE_HIDDEN=false в окружении).
const SITE_HIDDEN = process.env.SITE_HIDDEN !== "false"

// Страницы, которые остаются доступными при скрытом сайте.
const OPEN_PATHS = ["/maintenance", "/authorize", "/register"]

const crmAuth = withAuth({
    pages: {
        signIn: "/authorize",
    },
    callbacks: {
        authorized: ({ token }) => {
            if (!token) return false
            const role = (token as { role?: string }).role
            return role === "MANAGER" || role === "ADMIN"
        },
    },
})

export default function middleware(req: NextRequestWithAuth, event: NextFetchEvent) {
    const { pathname } = req.nextUrl

    if (pathname.startsWith("/crm")) {
        return crmAuth(req, event)
    }

    if (
        SITE_HIDDEN &&
        !OPEN_PATHS.some(path => pathname === path || pathname.startsWith(`${path}/`))
    ) {
        return NextResponse.redirect(new URL("/maintenance", req.url))
    }

    return NextResponse.next()
}

export const config = {
    // Всё, кроме API, внутренних ресурсов Next и файлов из /public (пути с точкой).
    matcher: ["/((?!api|_next|.*\\..*).*)"],
}
