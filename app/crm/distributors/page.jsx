import CounterpartyList from "@/components/crm/CounterpartyList"

export const metadata = { title: "Дистрибьюторы | CRM" }

export default function DistributorsPage() {
    return (
        <div className='space-y-4'>
            <h1 className='text-2xl font-semibold text-night_green'>Дистрибьюторы</h1>
            <CounterpartyList type='DISTRIBUTOR' newHref='/crm/distributors/new' />
        </div>
    )
}
