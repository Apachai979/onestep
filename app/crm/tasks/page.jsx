import { getServerSession } from "next-auth"
import { authOptions } from "@/configs/auth"
import TasksTabs from "@/components/crm/TasksTabs"
import { PageHeader } from "@/components/crm/ui"

export const metadata = { title: "Задачи | CRM" }

export default async function TasksPage() {
    const session = await getServerSession(authOptions)
    return (
        <div className='space-y-5'>
            <PageHeader
                title='Задачи'
                subtitle='Список и календарь: дедлайны, типы, ответственные.'
            />
            <TasksTabs
                currentUserId={session?.user?.id}
                currentUserRole={session?.user?.role}
            />
        </div>
    )
}
