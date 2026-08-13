import SalesReport from "@/components/crm/SalesReport"
import CrmBackLink from "@/components/crm/CrmBackLink"
import { PageHeader } from "@/components/crm/ui"

export const metadata = { title: "Продажи менеджеров | CRM" }

export default function SalesAnalyticsPage() {
    return (
        <div className='space-y-5'>
            <CrmBackLink fallback='/crm/analytics' fallbackLabel='Аналитика' className='inline-flex items-center gap-1 text-sm text-brand_main hover:underline' />
            <PageHeader
                title='Продажи менеджеров'
                subtitle='Продажей считается проведённая отгрузка по её фактической дате. Сумма — со скидкой сделки; сделки в статусах «Не реализована» и «Архив» не учитываются.'
            />
            <SalesReport />
        </div>
    )
}
