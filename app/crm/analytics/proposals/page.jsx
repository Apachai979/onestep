import { Suspense } from "react"
import CrmBackLink from "@/components/crm/CrmBackLink"
import ProposalsReport from "@/components/crm/ProposalsReport"
import { PageHeader } from "@/components/crm/ui"

export const metadata = { title: "Коммерческие предложения | CRM" }

export default function ProposalsAnalyticsPage() {
    return (
        <div className='space-y-5'>
            <CrmBackLink
                fallback='/crm/analytics'
                fallbackLabel='Аналитика'
                className='inline-flex items-center gap-1 text-sm text-brand_main hover:underline'
            />
            <PageHeader
                title='Коммерческие предложения'
                subtitle='Какие КП выставляли за период: номер, сделка, клиент, менеджер и что с КП сделали — сохранили в документы сделки или отправили клиенту письмом. КП, которое просто скачали, следа в CRM не оставляет и в реестр не попадает.'
            />
            {/* Suspense — требование useSearchParams внутри useUrlFilters:
                период и отбор компонент читает из адреса. */}
            <Suspense fallback={null}>
                <ProposalsReport />
            </Suspense>
        </div>
    )
}
