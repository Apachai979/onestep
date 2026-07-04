import ProjectsTabs from "@/components/crm/ProjectsTabs"
import { PageHeader } from "@/components/crm/ui"

export const metadata = { title: "Проекты | CRM" }

export default function ProjectsPage() {
    return (
        <div className='space-y-5'>
            <PageHeader
                title='Проекты'
                subtitle='Аукционные проекты: связки дистрибьютор — конечный потребитель.'
            />
            <ProjectsTabs />
        </div>
    )
}
