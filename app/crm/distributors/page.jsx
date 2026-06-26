import CounterpartyList from "@/components/crm/CounterpartyList"
import { PageHeader } from "@/components/crm/ui"

export const metadata = { title: "Дистрибьюторы | CRM" }

export default function DistributorsPage() {
    return (
        <div className='space-y-5'>
            <PageHeader
                title='Дистрибьюторы'
                subtitle='Справочник партнёров-посредников по регионам.'
            />
            <CounterpartyList type='DISTRIBUTOR' newHref='/crm/distributors/new' />
        </div>
    )
}
