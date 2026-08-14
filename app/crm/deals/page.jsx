import { Suspense } from "react"
import { getServerSession } from "next-auth"
import { authOptions } from "@/configs/auth"
import DealsTabs from "@/components/crm/DealsTabs"
import { PageHeader } from "@/components/crm/ui"

export const metadata = { title: "Сделки | CRM" }

export default async function DealsPage() {
    const session = await getServerSession(authOptions)
    return (
        <div className='space-y-5'>
            <PageHeader
                title='Сделки'
                subtitle='Прямые продажи клиентам: канбан, список и доска аукционов по срокам закупок.'
            />
            {/* Suspense — требование useSearchParams внутри useTabParam:
                вкладку компонент читает из адреса. */}
            <Suspense fallback={null}>
                <DealsTabs
                    currentUserId={session?.user?.id}
                    isAdmin={session?.user?.role === "ADMIN"}
                />
            </Suspense>
        </div>
    )
}
