import ShipmentsList from "@/components/crm/ShipmentsList"
import { PageHeader } from "@/components/crm/ui"

export const metadata = { title: "Отгрузки | CRM" }

export default function ShipmentsPage() {
    return (
        <div className='space-y-5'>
            <PageHeader
                title='Отгрузки'
                subtitle='Партии товара по сделкам: статус, остатки, плановые даты.'
            />
            <ShipmentsList />
        </div>
    )
}
