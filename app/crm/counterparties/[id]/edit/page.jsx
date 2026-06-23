import Link from "next/link"
import { notFound } from "next/navigation"
import prisma from "@/lib/client"
import CounterpartyForm from "@/components/crm/CounterpartyForm"
import { COUNTERPARTY_TYPE_LABELS } from "@/lib/crm/counterparty"

export const metadata = { title: "Редактирование | CRM" }

export default async function EditCounterpartyPage({ params }) {
    const item = await prisma.counterparty.findUnique({ where: { id: params.id } })
    if (!item) notFound()

    return (
        <div className='max-w-3xl space-y-4'>
            <div className='text-sm'>
                <Link
                    href={`/crm/counterparties/${item.id}`}
                    className='text-gray-500 hover:text-primary_green'
                >
                    ← {item.name}
                </Link>
            </div>
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
