import { notFound } from "next/navigation"
import prisma from "@/lib/client"
import ContactEditForm from "@/components/crm/ContactEditForm"
import CrmBackLink from "@/components/crm/CrmBackLink"

export const metadata = { title: "Контакт | CRM" }

export default async function ContactPage({ params }) {
    const item = await prisma.contact.findUnique({
        where: { id: params.id },
        include: { counterparty: { select: { id: true, name: true } } },
    })
    if (!item) notFound()

    const title = `${item.firstName ?? ""} ${item.lastName ?? ""}`.trim() || "Без имени"

    // Date → строка, чтобы безопасно передать в клиентскую форму.
    const initial = {
        id: item.id,
        firstName: item.firstName,
        lastName: item.lastName,
        phone: item.phone,
        email: item.email,
        position: item.position,
        isPrimary: item.isPrimary,
        counterpartyId: item.counterpartyId,
        birthDate: item.birthDate ? item.birthDate.toISOString() : null,
    }

    return (
        <div className='max-w-3xl space-y-4'>
            <CrmBackLink
                fallback='/crm/contacts'
                fallbackLabel='Контакты'
                className='inline-flex items-center gap-1 text-xs text-night_green/55 hover:text-brand_main'
            />
            <div className='min-w-0'>
                <p className='text-xs uppercase tracking-wider text-night_green/55'>Контакт</p>
                <h1 className='mt-0.5 text-xl font-semibold text-night_green sm:text-2xl'>
                    {title}
                </h1>
            </div>
            <ContactEditForm initial={initial} />
        </div>
    )
}
