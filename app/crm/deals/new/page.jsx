import Link from "next/link"
import { Suspense } from "react"
import { getServerSession } from "next-auth"
import { authOptions } from "@/configs/auth"
import prisma from "@/lib/client"
import { DEAL_STATUSES } from "@/lib/crm/deal"
import DealForm from "@/components/crm/DealForm"
import CrmBackLink from "@/components/crm/CrmBackLink"

export const metadata = { title: "Новая сделка | CRM" }

export default async function NewDealPage({ searchParams }) {
    const session = await getServerSession(authOptions)
    const rawStatus = searchParams?.status
    const defaultStatus = DEAL_STATUSES.includes(rawStatus) ? rawStatus : "NEGOTIATION"

    let fromProject = null
    if (searchParams?.fromProjectId) {
        const p = await prisma.project.findUnique({
            where: { id: searchParams.fromProjectId },
            select: {
                id: true,
                internalName: true,
                totalAmount: true,
                distributorId: true,
                endCustomerId: true,
                managerId: true,
                distributor: { select: { id: true, name: true } },
                endCustomer: { select: { id: true, name: true } },
            },
        })
        if (p) {
            fromProject = {
                ...p,
                totalAmount: p.totalAmount.toString(),
            }
        }
    }

    let fromAuction = null
    if (searchParams?.fromAuctionId) {
        const a = await prisma.auction.findUnique({
            where: { id: searchParams.fromAuctionId },
            select: {
                id: true,
                purchaseNumber: true,
                projectId: true,
                supplierId: true,
                supplierContactId: true,
                managerId: true,
                project: { select: { id: true, internalName: true } },
                supplier: { select: { id: true, name: true } },
            },
        })
        if (a) fromAuction = a
    }

    return (
        <div className='max-w-4xl space-y-4'>
            <CrmBackLink
                fallback='/crm/deals'
                fallbackLabel='Сделки'
                className='inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary_green'
            />
            <h1 className='text-2xl font-semibold text-night_green'>Новая сделка</h1>
            {fromAuction && (
                <div className='rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900'>
                    На основании аукциона{" "}
                    <Link
                        href={`/crm/auctions/${fromAuction.id}`}
                        className='font-medium underline'
                    >
                        {fromAuction.purchaseNumber
                            ? `Закупка № ${fromAuction.purchaseNumber}`
                            : "Аукцион"}
                    </Link>{" "}
                    (проект{" "}
                    <Link
                        href={`/crm/projects/${fromAuction.projectId}`}
                        className='font-medium underline'
                    >
                        {fromAuction.project?.internalName}
                    </Link>
                    ). Клиент — поставщик аукциона, менеджер, привязка к аукциону и проекту,
                    а также товарные позиции перенесены — отредактируйте при необходимости.
                </div>
            )}
            {!fromAuction && fromProject && (
                <div className='rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900'>
                    На основании проекта{" "}
                    <Link
                        href={`/crm/projects/${fromProject.id}`}
                        className='font-medium underline'
                    >
                        {fromProject.internalName}
                    </Link>
                    . Клиент, менеджер и привязка к проекту предзаполнены — отредактируйте
                    при необходимости перед сохранением.
                </div>
            )}
            <Suspense fallback={null}>
                <DealForm
                    mode='create'
                    currentUserId={session?.user?.id}
                    defaultStatus={defaultStatus}
                    fromProject={fromProject}
                    fromAuction={fromAuction}
                />
            </Suspense>
        </div>
    )
}
