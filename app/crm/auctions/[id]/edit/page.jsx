import { notFound } from "next/navigation"
import prisma from "@/lib/client"
import AuctionForm from "@/components/crm/AuctionForm"
import CrmBackLink from "@/components/crm/CrmBackLink"

export const metadata = { title: "Редактирование аукциона | CRM" }

export default async function EditAuctionPage({ params }) {
    const item = await prisma.auction.findUnique({
        where: { id: params.id },
        include: {
            customer: { select: { id: true, name: true } },
            supplier: { select: { id: true, name: true } },
        },
    })
    if (!item) notFound()

    const initial = {
        id: item.id,
        purchaseNumber: item.purchaseNumber,
        auctionUrl: item.auctionUrl,
        customerContactId: item.customerContactId,
        supplierContactId: item.supplierContactId,
        supplierId: item.supplierId,
        nmck: item.nmck.toString(),
        bidsDeadlineAt: item.bidsDeadlineAt?.toISOString() ?? null,
        auctionAt: item.auctionAt?.toISOString() ?? null,
        resultsAt: item.resultsAt?.toISOString() ?? null,
        managerId: item.managerId,
        participantsCount: item.participantsCount,
        bidsCount: item.bidsCount,
        winner: item.winner,
        customer: item.customer,
        supplier: item.supplier,
    }

    return (
        <div className='max-w-4xl space-y-4'>
            <CrmBackLink
                fallback={`/crm/auctions/${item.id}`}
                fallbackLabel='К аукциону'
                className='inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-brand_main'
            />
            <h1 className='text-2xl font-semibold text-neutral-900'>
                Редактирование аукциона
            </h1>
            <AuctionForm mode='edit' initial={initial} />
        </div>
    )
}
