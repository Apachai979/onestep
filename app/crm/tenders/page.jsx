import TendersList from "@/components/crm/TendersList"
import { PageHeader } from "@/components/crm/ui"

export const metadata = { title: "Закупки | CRM" }

export default function TendersPage() {
    return (
        <div className='space-y-5'>
            <PageHeader
                title='Закупки'
                subtitle='Входящие закупки из Tenderland: разберите, по каким участвуем, и заведите сделку.'
            />
            <TendersList />
        </div>
    )
}
