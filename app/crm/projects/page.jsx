import { getServerSession } from "next-auth"
import { authOptions } from "@/configs/auth"
import ProjectsTabs from "@/components/crm/ProjectsTabs"
import { PageHeader } from "@/components/crm/ui"

export const metadata = { title: "Проекты | CRM" }

export default async function ProjectsPage() {
    const session = await getServerSession(authOptions)

    return (
        <div className='space-y-5'>
            <PageHeader
                title='Проекты'
                subtitle='Аукционные проекты: связки дистрибьютор — конечный потребитель.'
            />
            <ProjectsTabs isAdmin={session?.user?.role === "ADMIN"} />
        </div>
    )
}
