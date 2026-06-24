import Link from "next/link"
import { Suspense } from "react"
import { getServerSession } from "next-auth"
import { authOptions } from "@/configs/auth"
import { DEAL_STATUSES } from "@/lib/crm/deal"
import DealForm from "@/components/crm/DealForm"

export const metadata = { title: "Новая сделка | CRM" }

export default async function NewDealPage({ searchParams }) {
    const session = await getServerSession(authOptions)
    const rawStatus = searchParams?.status
    const defaultStatus = DEAL_STATUSES.includes(rawStatus) ? rawStatus : "NEW"

    return (
        <div className='max-w-4xl space-y-4'>
            <div className='text-sm'>
                <Link href='/crm/deals' className='text-gray-500 hover:text-primary_green'>
                    ← Сделки
                </Link>
            </div>
            <h1 className='text-2xl font-semibold text-night_green'>Новая сделка</h1>
            <Suspense fallback={null}>
                <DealForm
                    mode='create'
                    currentUserId={session?.user?.id}
                    defaultStatus={defaultStatus}
                />
            </Suspense>
        </div>
    )
}
