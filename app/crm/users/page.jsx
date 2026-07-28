import { getServerSession } from "next-auth"
import { authOptions } from "@/configs/auth"
import AdminUsersTable from "@/components/crm/AdminUsersTable"
import UsersDirectory from "@/components/crm/UsersDirectory"
import InvitesSection from "@/components/crm/InvitesSection"
import { PageHeader } from "@/components/crm/ui"

export const metadata = { title: "Пользователи | CRM" }

export default async function UsersPage() {
    const session = await getServerSession(authOptions)
    const isAdmin = session?.user?.role === "ADMIN"

    // Менеджер видит справочник контактов, админ — управление доступами.
    if (!isAdmin) {
        return (
            <div className='space-y-6'>
                <PageHeader
                    title='Сотрудники'
                    subtitle='Контакты коллег. Свои данные можно изменить в разделе «Мой профиль».'
                />
                <UsersDirectory currentUserId={session.user.id} />
            </div>
        )
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
