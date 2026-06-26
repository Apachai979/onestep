import { Inter, Noto_Sans } from "next/font/google"
import "./globals.css"
import TheHeader from "@/components/TheHeader"
import TheFooter from "@/components/TheFooter"
import Providers from "@/components/Providers"

const inter = Inter({ subsets: ["latin"] })
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
}

export default function Layout({ children, modal }) {
    return (
        <Providers>
            <html lang='en' className="">
                <body
                    className={`${notoSans.className} max-w-sm min-h-screen bg-body_bg text-night_green min-w-full antialiased overflow-visible`}
                >
                    <TheHeader />
                    <main className='grid grid-cols-1 '>
                        {children}
                        {modal}
                    </main>
                    <TheFooter />
                </body>
            </html>
        </Providers>
    )
}
