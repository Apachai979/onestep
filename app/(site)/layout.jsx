import TheHeader from "@/components/TheHeader"
import TheFooter from "@/components/TheFooter"

// Оболочка публичного сайта. CRM и /maintenance лежат вне группы (site),
// поэтому шапка и подвал до них не доходят — прятать их в рантайме не нужно.
export default function SiteLayout({ children, modal }) {
    return (
        <>
            <TheHeader />
            <main className='grid grid-cols-1'>
                {children}
                {modal}
            </main>
            <TheFooter />
        </>
    )
}
