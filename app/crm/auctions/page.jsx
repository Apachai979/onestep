import { getServerSession } from "next-auth"
import { authOptions } from "@/configs/auth"
import AuctionsTabs from "@/components/crm/AuctionsTabs"
import { PageHeader } from "@/components/crm/ui"

export const metadata = { title: "Аукционы | CRM" }

export default async function AuctionsPage() {
    const session = await getServerSession(authOptions)
    return (
        <div className='space-y-5'>
            <PageHeader
                title='Аукционы'
                subtitle='Госзакупки по проектам: канбан и список с фильтрами.'
            />
            <AuctionsTabs currentUserId={session?.user?.id} />
        </div>
    )
}
