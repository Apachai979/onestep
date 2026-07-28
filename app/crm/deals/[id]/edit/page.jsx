import { notFound, redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/configs/auth"
import prisma from "@/lib/client"
import DealForm from "@/components/crm/DealForm"
import CrmBackLink from "@/components/crm/CrmBackLink"
import { dealDisplayTitle } from "@/lib/crm/deal"
import { isDealLocked } from "@/lib/crm/access"

export const metadata = { title: "Редактирование сделки | CRM" }

export default async function EditDealPage({ params }) {
    const item = await prisma.deal.findUnique({
        where: { id: params.id },
        include: {
            counterparty: { select: { name: true } },
            sourceProject: {
                select: { id: true, internalName: true, distributorId: true, endCustomerId: true },
            },
        },
    })
    if (!item) notFound()

    const session = await getServerSession(authOptions)
    if (isDealLocked(item.status, session)) {
        redirect(`/crm/deals/${item.id}`)
    }

    // Скидка входит в суммы отгрузок — после проведения документа не меняется.
    const shippedCount = await prisma.shipment.count({
        where: { dealId: item.id, status: "SHIPPED" },
    })

    const initial = {
        ...item,
        totalAmount: item.totalAmount.toString(),
        discount: item.discount != null ? item.discount.toString() : null,
        nmck: item.nmck != null ? item.nmck.toString() : null,
        bidsDeadlineAt: item.bidsDeadlineAt ? item.bidsDeadlineAt.toISOString() : null,
        auctionAt: item.auctionAt ? item.auctionAt.toISOString() : null,
        resultsAt: item.resultsAt ? item.resultsAt.toISOString() : null,
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
            <DealForm
                mode='edit'
                initial={initial}
                linkedProject={item.sourceProject}
                discountLocked={shippedCount > 0}
            />
        </div>
    )
}
