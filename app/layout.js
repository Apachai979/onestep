import { Noto_Sans } from "next/font/google"
import "./globals.css"
import Providers from "@/components/Providers"

const notoSans = Noto_Sans({
    subsets: ["cyrillic"],
    weight: ["300", "400", "500", "600", "700", "800"],
    style: ["normal", "italic"],
})

export const metadata = {
    title: {
        template: "%s | Onestep",
        default: "Onestep",
        description:
            "Российский производитель медицинских одноразовых перевязочных материалов и процедурных стерильных наборов",
    },
    appleWebApp: {
        capable: true,
        title: "CRM",
        statusBarStyle: "default",
    },
    icons: {
        icon: "/icons/icon-192.png",
        apple: "/icons/apple-icon-180.png",
    },
}

export const viewport = {
    themeColor: "#133531",
}

// Корневой layout держит только общий каркас документа: шрифты, стили, SessionProvider.
// Разметка сайта живёт в app/(site)/layout.jsx, разметка CRM — в app/crm/layout.jsx.
export default function Layout({ children }) {
    return (
        <Providers>
            <html lang='ru'>
                <body
                    className={`${notoSans.className} max-w-sm min-h-screen bg-body_bg text-night_green min-w-full antialiased overflow-visible`}
                >
                    {children}
                </body>
            </html>
        </Providers>
    )
}
