import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/configs/auth"
import { PROPOSAL_EMAIL_PLACEHOLDERS } from "@/lib/crm/settings"
import ProposalEmailSettings from "@/components/crm/ProposalEmailSettings"
import { PageHeader } from "@/components/crm/ui"

export const metadata = { title: "Настройки | CRM" }

export default async function SettingsPage() {
    const session = await getServerSession(authOptions)
    if (session?.user?.role !== "ADMIN") redirect("/crm")

    return (
        <div className='space-y-5'>
            <PageHeader
                title='Настройки'
                subtitle='Шаблоны и параметры CRM. Доступно только администратору.'
            />
            <ProposalEmailSettings placeholders={PROPOSAL_EMAIL_PLACEHOLDERS} />
        </div>
    )
}
