import { getServerSession } from "next-auth"
import { authOptions } from "@/configs/auth"
import TasksTabs from "@/components/crm/TasksTabs"

export const metadata = { title: "Задачи | CRM" }

export default async function TasksPage() {
    const session = await getServerSession(authOptions)
    return (
        <div className='space-y-4'>
            <h1 className='text-2xl font-semibold text-night_green'>Задачи</h1>
            <TasksTabs
                currentUserId={session?.user?.id}
                currentUserRole={session?.user?.role}
            />
        </div>
    )
}
