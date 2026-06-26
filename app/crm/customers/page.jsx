import CounterpartyList from "@/components/crm/CounterpartyList"
import { PageHeader } from "@/components/crm/ui"

export const metadata = { title: "Конечные потребители | CRM" }

export default function CustomersPage() {
    return (
        <div className='space-y-5'>
            <PageHeader
                title='Конечные потребители'
                subtitle='Справочник лечебных учреждений и других конечных получателей.'
            />
            <CounterpartyList type='END_CUSTOMER' newHref='/crm/customers/new' />
        </div>
    )
}
