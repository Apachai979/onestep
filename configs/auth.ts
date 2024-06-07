import { NextAuthOptions } from "next-auth"

import GithubProvider from "next-auth/providers/github"
import GoogleProvider from "next-auth/providers/google"
import MailruProvider from "next-auth/providers/mailru"

export const authOptions: NextAuthOptions = {
    providers: [
        GithubProvider({
            clientId: process.env.GITHUB_ID as string,
            clientSecret: process.env.GITHUB_SECRET as string,
        }),
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_SECRET as string,
        }),
        MailruProvider({
            clientId: process.env.AUTH_MAILRU_ID as string,
            clientSecret: process.env.AUTH_MAILRU_SECRET as string,
        }),
    ],
}
