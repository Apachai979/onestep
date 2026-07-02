import LeadsList from "@/components/crm/LeadsList"
import { PageHeader } from "@/components/crm/ui"

export const metadata = { title: "Заявки с сайта | CRM" }

export default function LeadsPage() {
    return (
        <div className='space-y-5'>
            <PageHeader
                title='Заявки с сайта'
                subtitle='Обращения с формы обратной связи: консультации, вопросы, контакты.'
            />
            <LeadsList />
        </div>
    )
}
