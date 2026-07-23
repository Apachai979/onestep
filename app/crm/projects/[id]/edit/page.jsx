import { notFound, redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/configs/auth"
import prisma from "@/lib/client"
import ProjectForm from "@/components/crm/ProjectForm"
import CrmBackLink from "@/components/crm/CrmBackLink"
import { isProjectLocked } from "@/lib/crm/access"

export const metadata = { title: "Редактирование проекта | CRM" }

export default async function EditProjectPage({ params }) {
    const item = await prisma.project.findUnique({
        where: { id: params.id },
        include: { contacts: { select: { id: true } } },
    })
    if (!item) notFound()

    const session = await getServerSession(authOptions)
    if (isProjectLocked(item.status, session)) {
        redirect(`/crm/projects/${item.id}`)
    }

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
                className='inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-brand_main'
            />
            <h1 className='text-2xl font-semibold text-neutral-900'>Редактирование проекта</h1>
            <ProjectForm mode='edit' initial={initial} />
        </div>
    )
}
