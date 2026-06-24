import Link from "next/link"
import { notFound } from "next/navigation"
import prisma from "@/lib/client"
import DealForm from "@/components/crm/DealForm"
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
            <div className='text-sm'>
                <Link
                    href={`/crm/deals/${item.id}`}
                    className='text-gray-500 hover:text-primary_green'
                >
                    ← {dealDisplayTitle(item, item.counterparty?.name)}
                </Link>
            </div>
            <h1 className='text-2xl font-semibold text-night_green'>Редактирование сделки</h1>
            <DealForm mode='edit' initial={initial} />
        </div>
    )
}
