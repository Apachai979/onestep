import { notFound } from "next/navigation"
import prisma from "@/lib/client"
import ProjectForm from "@/components/crm/ProjectForm"
import CrmBackLink from "@/components/crm/CrmBackLink"

export const metadata = { title: "Редактирование проекта | CRM" }

export default async function EditProjectPage({ params }) {
    const item = await prisma.project.findUnique({
        where: { id: params.id },
        include: { contacts: { select: { id: true } } },
    })
    if (!item) notFound()

    const initial = {
        ...item,
        totalAmount: item.totalAmount.toString(),
        auctionDate: item.auctionDate ? item.auctionDate.toISOString() : null,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
    }

    return (
        <div className='max-w-4xl space-y-4'>
            <CrmBackLink
                fallback={`/crm/projects/${item.id}`}
                fallbackLabel={item.internalName}
                className='inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary_green'
            />
            <h1 className='text-2xl font-semibold text-night_green'>Редактирование проекта</h1>
            <ProjectForm mode='edit' initial={initial} />
        </div>
    )
}
