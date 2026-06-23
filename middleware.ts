import { withAuth } from "next-auth/middleware"

export default withAuth({
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

export const config = {
    matcher: ["/crm/:path*"],
}
