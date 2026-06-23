import ProjectsList from "@/components/crm/ProjectsList"

export const metadata = { title: "Проекты | CRM" }

export default function ProjectsPage() {
    return (
        <div className='space-y-4'>
            <h1 className='text-2xl font-semibold text-night_green'>Проекты</h1>
            <ProjectsList />
        </div>
    )
}
