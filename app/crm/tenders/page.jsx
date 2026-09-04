import { getServerSession } from "next-auth"
import { authOptions } from "@/configs/auth"
import TendersList from "@/components/crm/TendersList"
import { PageHeader } from "@/components/crm/ui"

export const metadata = { title: "Закупки | CRM" }

export default async function TendersPage() {
    const session = await getServerSession(authOptions)
    return (
        <div className='space-y-5'>
            <PageHeader
                title='Закупки'
                subtitle='Входящие закупки из Tenderland: разберите, по каким участвуем, и заведите сделку.'
            />
            {/* Отмена участия (ошибочно взятая закупка) доступна только
                администратору — то же правило проверяет и PATCH-роут. */}
            <TendersList isAdmin={session?.user?.role === "ADMIN"} />
        </div>
    )
}
