import CounterpartyForm from "@/components/crm/CounterpartyForm"
import CrmBackLink from "@/components/crm/CrmBackLink"

export const metadata = { title: "Новый дистрибьютор | CRM" }

export default function NewDistributorPage() {
    return (
        <div className='max-w-3xl space-y-4'>
            <CrmBackLink
                fallback='/crm/distributors'
                fallbackLabel='Дистрибьюторы'
                className='inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-brand_main'
            />
            <h1 className='text-2xl font-semibold text-neutral-900'>Новый дистрибьютор</h1>
            <CounterpartyForm type='DISTRIBUTOR' mode='create' />
        </div>
    )
}
