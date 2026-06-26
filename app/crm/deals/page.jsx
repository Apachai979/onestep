import { getServerSession } from "next-auth"
import { authOptions } from "@/configs/auth"
import DealsTabs from "@/components/crm/DealsTabs"

export const metadata = { title: "Сделки | CRM" }

export default async function DealsPage() {
    const session = await getServerSession(authOptions)
    return (
        <div className='space-y-4'>
            <h1 className='text-2xl font-semibold text-night_green'>Сделки</h1>
            <DealsTabs currentUserId={session?.user?.id} />
        </div>
    )
}
