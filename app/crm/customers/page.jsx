import CounterpartyList from "@/components/crm/CounterpartyList"

export const metadata = { title: "Конечные потребители | CRM" }

export default function CustomersPage() {
    return (
        <div className='space-y-4'>
            <h1 className='text-2xl font-semibold text-night_green'>Конечные потребители</h1>
            <CounterpartyList type='END_CUSTOMER' newHref='/crm/customers/new' />
        </div>
    )
}
