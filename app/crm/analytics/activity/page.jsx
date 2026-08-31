import ActivityReport from "@/components/crm/ActivityReport"
import CrmBackLink from "@/components/crm/CrmBackLink"
import { PageHeader } from "@/components/crm/ui"

export const metadata = { title: "Активность в CRM | CRM" }

export default function ActivityAnalyticsPage() {
    return (
        <div className='space-y-5'>
            <CrmBackLink
                fallback='/crm/analytics'
                fallbackLabel='Аналитика'
                className='inline-flex items-center gap-1 text-sm text-brand_main hover:underline'
            />
            <PageHeader
                title='Активность в CRM'
                subtitle='Кто и над чем работал в системе за период — по журналу изменений. Действие засчитывается автору записи; считаются все правки, включая позиции, файлы и заметки.'
            />
            <ActivityReport />
        </div>
    )
}
