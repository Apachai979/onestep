import ShipmentsList from "@/components/crm/ShipmentsList"

export const metadata = { title: "Отгрузки | CRM" }

export default function ShipmentsPage() {
    return (
        <div className='space-y-4'>
            <h1 className='text-2xl font-semibold text-night_green'>Отгрузки</h1>
            <ShipmentsList />
        </div>
    )
}
