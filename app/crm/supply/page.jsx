import SupplyReport from "@/components/crm/SupplyReport"
import { PageHeader } from "@/components/crm/ui"

export const metadata = { title: "Обеспечение | CRM" }

export default function SupplyPage() {
    return (
        <div className='space-y-5'>
            <PageHeader
                title='Обеспечение'
                subtitle='Остатки на складах против обещанного клиентам: сделки в статусах «Согласовано / Позиции», «Договор / Счёт» и «Выполнение / Отгрузка» за вычетом уже отгруженного.'
            />
            <SupplyReport />
        </div>
    )
}
