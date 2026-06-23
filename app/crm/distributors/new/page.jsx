import Link from "next/link"
import CounterpartyForm from "@/components/crm/CounterpartyForm"

export const metadata = { title: "Новый дистрибьютор | CRM" }

export default function NewDistributorPage() {
    return (
        <div className='max-w-3xl space-y-4'>
            <div className='text-sm'>
                <Link href='/crm/distributors' className='text-gray-500 hover:text-primary_green'>
                    ← Дистрибьюторы
                </Link>
            </div>
            <h1 className='text-2xl font-semibold text-night_green'>Новый дистрибьютор</h1>
            <CounterpartyForm type='DISTRIBUTOR' mode='create' />
        </div>
    )
}
