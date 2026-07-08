import ContactsDirectory from "@/components/crm/ContactsDirectory"

export const metadata = { title: "Контакты | CRM" }

export default function ContactsPage() {
    return (
        <div className='space-y-4'>
            <div>
                <h1 className='text-xl font-semibold text-night_green sm:text-2xl'>Контакты</h1>
                <p className='mt-0.5 text-sm text-night_green/60'>
                    Все контактные лица с привязкой к контрагенту.
                </p>
            </div>
            <ContactsDirectory />
        </div>
    )
}
