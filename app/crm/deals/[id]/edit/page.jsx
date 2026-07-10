import { notFound } from "next/navigation"
import prisma from "@/lib/client"
import DealForm from "@/components/crm/DealForm"
import CrmBackLink from "@/components/crm/CrmBackLink"
import { dealDisplayTitle } from "@/lib/crm/deal"

export const metadata = { title: "Редактирование сделки | CRM" }

export default async function EditDealPage({ params }) {
    const item = await prisma.deal.findUnique({
        where: { id: params.id },
        include: { counterparty: { select: { name: true } } },
    })
    if (!item) notFound()

    const initial = {
        ...item,
        totalAmount: item.totalAmount.toString(),
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
    }

    return (
        <div className='max-w-4xl space-y-4'>
            <CrmBackLink
                fallback={`/crm/deals/${item.id}`}
                fallbackLabel={dealDisplayTitle(item, item.counterparty?.name)}
                className='inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-brand_main'
            />
            <h1 className='text-2xl font-semibold text-neutral-900'>Редактирование сделки</h1>
            <DealForm mode='edit' initial={initial} />
        </div>
    )
}
