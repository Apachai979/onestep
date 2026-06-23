import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GithubProvider from "next-auth/providers/github"
import GoogleProvider from "next-auth/providers/google"
import MailRuProvider from "next-auth/providers/mailru"
import bcrypt from "bcryptjs"
import prisma from "@/lib/client"

function displayName(user: { firstName?: string | null; lastName?: string | null; email: string }) {
    const composed = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim()
    return composed || user.email
}

export const authOptions: NextAuthOptions = {
    session: {
        strategy: "jwt",
    },
    pages: {
        signIn: "/authorize",
    },
    providers: [
        CredentialsProvider({
            name: "credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Пароль", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error("Введите email и пароль")
                }

                const user = await prisma.user.findUnique({
                    where: { email: credentials.email.toLowerCase().trim() },
                })

                if (!user) {
                    throw new Error("Неверный email или пароль")
                }

                const isValid = await bcrypt.compare(credentials.password, user.passwordHash)
                if (!isValid) {
                    throw new Error("Неверный email или пароль")
                }

                if (user.status !== "ACTIVE") {
                    throw new Error("Учётная запись заблокирована")
                }

                return {
                    id: user.id,
                    email: user.email,
                    name: displayName(user),
                    role: user.role,
                } as never
            },
        }),
        GithubProvider({
            clientId: process.env.GITHUB_ID as string,
            clientSecret: process.env.GITHUB_SECRET as string,
        }),
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_SECRET as string,
        }),
        MailRuProvider({
            clientId: process.env.MAILRU_CLIENT_ID,
            clientSecret: process.env.MAILRU_CLIENT_SECRET,
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = (user as { id?: string }).id
                token.role = (user as { role?: string }).role ?? "MANAGER"
            }
            return token
        },
        async session({ session, token }) {
            if (session.user) {
                ;(session.user as { id?: string; role?: string }).id = token.id as string
                ;(session.user as { id?: string; role?: string }).role = token.role as string
            }
            return session
        },
    },
}
