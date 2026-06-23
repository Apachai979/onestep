import Link from "next/link"
import CounterpartyForm from "@/components/crm/CounterpartyForm"

export const metadata = { title: "Новый конечный потребитель | CRM" }

export default function NewCustomerPage() {
    return (
        <div className='max-w-3xl space-y-4'>
            <div className='text-sm'>
                <Link href='/crm/customers' className='text-gray-500 hover:text-primary_green'>
                    ← Конечные потребители
                </Link>
            </div>
            <h1 className='text-2xl font-semibold text-night_green'>Новый конечный потребитель</h1>
            <CounterpartyForm type='END_CUSTOMER' mode='create' />
        </div>
    )
}
