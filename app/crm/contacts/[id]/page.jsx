import { notFound } from "next/navigation"
import { LuPhone } from "react-icons/lu"
import prisma from "@/lib/client"
import ContactEditForm from "@/components/crm/ContactEditForm"
import CrmBackLink from "@/components/crm/CrmBackLink"
import PhoneLink from "@/components/crm/PhoneLink"

const CALL_BTN =
    "inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-1.5 text-sm shadow-sm hover:bg-surface_muted"

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
        workPhone: item.workPhone,
        email: item.email,
        position: item.position,
        comment: item.comment,
        isPrimary: item.isPrimary,
        counterpartyId: item.counterpartyId,
        birthDate: item.birthDate ? item.birthDate.toISOString() : null,
    }

    return (
        <div className='max-w-3xl space-y-4'>
            <CrmBackLink
                fallback='/crm/contacts'
                fallbackLabel='Контакты'
                className='inline-flex items-center gap-1 text-xs text-neutral-400 hover:text-brand_main'
            />
            <div className='min-w-0'>
                <p className='text-xs uppercase tracking-wider text-neutral-400'>Контакт</p>
                <h1 className='mt-0.5 text-xl font-semibold text-neutral-900 sm:text-2xl'>
                    {title}
                </h1>
                {(item.phone || item.workPhone) && (
                    <div className='mt-2 flex flex-wrap gap-2'>
                        {item.phone && (
                            <PhoneLink phone={item.phone} className={CALL_BTN}>
                                <LuPhone className='h-4 w-4' />
                                {item.phone}
                            </PhoneLink>
                        )}
                        {item.workPhone && (
                            <PhoneLink phone={item.workPhone} className={CALL_BTN}>
                                <LuPhone className='h-4 w-4' />
                                раб. {item.workPhone}
                            </PhoneLink>
                        )}
                    </div>
                )}
            </div>
            <ContactEditForm initial={initial} />
        </div>
    )
}
