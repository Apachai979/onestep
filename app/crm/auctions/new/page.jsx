import Link from "next/link"
import { notFound } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/configs/auth"
import prisma from "@/lib/client"
import AuctionForm from "@/components/crm/AuctionForm"
import CrmBackLink from "@/components/crm/CrmBackLink"

export const metadata = { title: "Новый аукцион | CRM" }

export default async function NewAuctionPage({ searchParams }) {
    const session = await getServerSession(authOptions)
    const projectId = searchParams?.fromProjectId
    if (!projectId) notFound()

    const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: {
            id: true,
            internalName: true,
            managerId: true,
            distributorId: true,
            endCustomerId: true,
            distributor: { select: { id: true, name: true } },
            endCustomer: { select: { id: true, name: true } },
        },
    })
    if (!project) notFound()

    return (
        <div className='max-w-4xl space-y-4'>
            <CrmBackLink
                fallback={`/crm/projects/${project.id}`}
                fallbackLabel='К проекту'
                className='inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary_green'
            />
            <h1 className='text-2xl font-semibold text-night_green'>Новый аукцион</h1>
            <div className='rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900'>
                По проекту{" "}
                <Link href={`/crm/projects/${project.id}`} className='font-medium underline'>
                    {project.internalName}
                </Link>
                . Заказчик и поставщик взяты из проекта.
            </div>
            <AuctionForm mode='create' project={project} currentUserId={session?.user?.id} />
        </div>
    )
}
