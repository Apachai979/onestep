import { notFound } from "next/navigation"
import prisma from "@/lib/client"
import CounterpartyForm from "@/components/crm/CounterpartyForm"
import CrmBackLink from "@/components/crm/CrmBackLink"
import { COUNTERPARTY_TYPE_LABELS } from "@/lib/crm/counterparty"

export const metadata = { title: "Редактирование | CRM" }

export default async function EditCounterpartyPage({ params }) {
    const item = await prisma.counterparty.findUnique({ where: { id: params.id } })
    if (!item) notFound()

    return (
        <div className='max-w-3xl space-y-4'>
            <CrmBackLink
                fallback={`/crm/counterparties/${item.id}`}
                fallbackLabel={item.name}
                className='inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary_green'
            />
            <div>
                <p className='text-xs uppercase text-gray-500'>
                    {COUNTERPARTY_TYPE_LABELS[item.type]}
                </p>
                <h1 className='mt-1 text-2xl font-semibold text-night_green'>
                    Редактирование
                </h1>
            </div>
            <CounterpartyForm type={item.type} mode='edit' initial={item} />
        </div>
    )
}
