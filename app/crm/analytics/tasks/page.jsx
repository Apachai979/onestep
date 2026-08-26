import TasksReport from "@/components/crm/TasksReport"
import CrmBackLink from "@/components/crm/CrmBackLink"
import { PageHeader } from "@/components/crm/ui"

export const metadata = { title: "Задачи менеджеров | CRM" }

export default function TasksAnalyticsPage() {
    return (
        <div className='space-y-5'>
            <CrmBackLink
                fallback='/crm/analytics'
                fallbackLabel='Аналитика'
                className='inline-flex items-center gap-1 text-sm text-brand_main hover:underline'
            />
            <PageHeader
                title='Задачи менеджеров'
                subtitle='Две оси: «сделано» — задачи, закрытые внутри периода; «запланировано» — задачи, срок которых пришёлся на период, и чем они кончились. Задача засчитывается исполнителю.'
            />
            <TasksReport />
        </div>
    )
}
