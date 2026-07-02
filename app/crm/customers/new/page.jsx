import CounterpartyForm from "@/components/crm/CounterpartyForm"
import CrmBackLink from "@/components/crm/CrmBackLink"

export const metadata = { title: "Новый конечный потребитель | CRM" }

export default function NewCustomerPage() {
    return (
        <div className='max-w-3xl space-y-4'>
            <CrmBackLink
                fallback='/crm/customers'
                fallbackLabel='Конечные потребители'
                className='inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary_green'
            />
            <h1 className='text-2xl font-semibold text-night_green'>Новый конечный потребитель</h1>
            <CounterpartyForm type='END_CUSTOMER' mode='create' />
        </div>
    )
}
