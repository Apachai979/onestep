import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/configs/auth"
import AdminUsersTable from "@/components/crm/AdminUsersTable"
import InvitesSection from "@/components/crm/InvitesSection"
import { PageHeader } from "@/components/crm/ui"

export const metadata = { title: "Пользователи | CRM" }

export default async function UsersPage() {
    const session = await getServerSession(authOptions)
    if (session?.user?.role !== "ADMIN") {
        redirect("/crm")
    }
    return (
        <div className='space-y-6'>
            <PageHeader
                title='Пользователи'
                subtitle='Сотрудники с доступом к CRM и приглашения.'
            />
            <AdminUsersTable currentUserId={session.user.id} />
            <InvitesSection />
        </div>
    )
}
