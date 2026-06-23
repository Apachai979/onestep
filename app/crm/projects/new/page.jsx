import Link from "next/link"
import { getServerSession } from "next-auth"
import { authOptions } from "@/configs/auth"
import ProjectForm from "@/components/crm/ProjectForm"

export const metadata = { title: "Новый проект | CRM" }

export default async function NewProjectPage() {
    const session = await getServerSession(authOptions)
    return (
        <div className='max-w-4xl space-y-4'>
            <div className='text-sm'>
                <Link href='/crm/projects' className='text-gray-500 hover:text-primary_green'>
                    ← Проекты
                </Link>
            </div>
            <h1 className='text-2xl font-semibold text-night_green'>Новый проект</h1>
            <ProjectForm mode='create' currentUserId={session?.user?.id} />
        </div>
    )
}
