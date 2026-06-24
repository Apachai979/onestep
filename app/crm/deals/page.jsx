import DealsKanban from "@/components/crm/DealsKanban"

export const metadata = { title: "Сделки | CRM" }

export default function DealsPage() {
    return (
        <div className='space-y-4'>
            <h1 className='text-2xl font-semibold text-night_green'>Сделки</h1>
            <DealsKanban />
        </div>
    )
}
