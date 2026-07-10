import { getServerSession } from "next-auth"
import { authOptions } from "@/configs/auth"
import ProjectForm from "@/components/crm/ProjectForm"
import CrmBackLink from "@/components/crm/CrmBackLink"

export const metadata = { title: "Новый проект | CRM" }

export default async function NewProjectPage() {
    const session = await getServerSession(authOptions)
    return (
        <div className='max-w-4xl space-y-4'>
            <CrmBackLink
                fallback='/crm/projects'
                fallbackLabel='Проекты'
                className='inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-brand_main'
            />
            <h1 className='text-2xl font-semibold text-neutral-900'>Новый проект</h1>
            <ProjectForm mode='create' currentUserId={session?.user?.id} />
        </div>
    )
}
