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
                discount: true,
                distributorId: true,
                endCustomerId: true,
                managerId: true,
                distributor: { select: { id: true, name: true } },
                endCustomer: { select: { id: true, name: true } },
                // Позиции проекта переносятся в сделку при создании — форма
                // показывает, сколько именно и на какую сумму.
                items: { select: { amount: true } },
            },
        })
        if (p) {
            const { items, ...rest } = p
            fromProject = {
                ...rest,
                totalAmount: p.totalAmount.toString(),
                discount: p.discount != null ? p.discount.toString() : null,
                itemsCount: items.length,
                itemsTotal: items.reduce((s, it) => s + Number(it.amount), 0),
            }
        }
    }

    // Из проекта можно создать и обычную сделку, и аукцион — режим выбирается
    // галочкой в форме. Ссылка «Создать аукцион» приходит с ?auction=1.
    const defaultIsAuction = searchParams?.auction === "1"

    return (
        <div className='max-w-4xl space-y-4'>
            <CrmBackLink
                fallback='/crm/deals'
                fallbackLabel='Сделки'
                className='inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-brand_main'
            />
            <h1 className='text-2xl font-semibold text-neutral-900'>
                {defaultIsAuction ? "Новая сделка / аукцион" : "Новая сделка"}
            </h1>
            <Suspense fallback={null}>
                <DealForm
                    mode='create'
                    currentUserId={session?.user?.id}
                    defaultStatus={defaultStatus}
                    fromProject={fromProject}
                    defaultIsAuction={defaultIsAuction}
                />
            </Suspense>
        </div>
    )
}
