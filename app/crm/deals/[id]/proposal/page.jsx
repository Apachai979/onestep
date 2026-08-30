import { notFound, redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/configs/auth"
import prisma from "@/lib/client"
import ProposalView from "@/components/crm/ProposalView"
import { isDealLocked } from "@/lib/crm/access"
import { nextProposalNumber } from "@/lib/crm/proposal-number"

export const metadata = { title: "Коммерческое предложение | CRM" }

function toNum(v) {
    if (v === null || v === undefined) return 0
    const s = typeof v === "object" && v.toString ? v.toString() : String(v)
    const n = Number(s.replace(",", "."))
    return Number.isFinite(n) ? n : 0
}

// В КП покупателя и конечного потребителя подписываем ИНН — по нему заказчик
// сверяет, на кого оформлять документы. Строка попадает в редактируемое поле
// формы, так что менеджер может её поправить.
function withInn(counterparty) {
    if (!counterparty?.name) return ""
    const inn = counterparty.inn?.trim()
    return inn ? `${counterparty.name} (ИНН ${inn})` : counterparty.name
}

export default async function ProposalPage({ params }) {
    const session = await getServerSession(authOptions)

    const deal = await prisma.deal.findUnique({
        where: { id: params.id },
        include: {
            counterparty: true,
            // Если документы оформляются на другое юрлицо клиента, покупателем
            // в КП должно быть именно оно.
            payer: { select: { name: true, email: true, inn: true } },
            contact: true,
            manager: true,
            // Конечный потребитель для КП берётся из проекта-источника,
            // а для сделок-аукционов — это заказчик аукциона.
            sourceProject: {
                include: { endCustomer: { select: { name: true, inn: true } } },
            },
            auctionCustomer: { select: { name: true, inn: true } },
        },
    })
    if (!deal) notFound()

    if (isDealLocked(deal.status, session)) {
        redirect(`/crm/deals/${deal.id}`)
    }

    const items = await prisma.dealItem.findMany({
        where: { dealId: deal.id },
        select: {
            quantity: true,
            product: { select: { unitWeightKg: true, unitVolumeM3: true } },
        },
    })

    // Клиенту позиции не нужны: документ рисует сервер. Отсюда — только
    // объём и вес по умолчанию и счётчик, чтобы предупредить о пустой сделке.
    const totalWeight = items.reduce(
        (sum, it) => sum + toNum(it.product?.unitWeightKg) * toNum(it.quantity),
        0,
    )
    const totalVolume = items.reduce(
        (sum, it) => sum + toNum(it.product?.unitVolumeM3) * toNum(it.quantity),
        0,
    )

    // Скидка в КП берётся из сделки. Если в сделке не задана —
    // фоллбэк на скидку контрагента (для старых сделок).
    const discountForProposal =
        deal.discount !== null && deal.discount !== undefined
            ? toNum(deal.discount)
            : toNum(deal.counterparty?.discount)

    let senderName = session?.user?.name || ""
    let senderEmail = session?.user?.email || ""
    let senderPhone = ""
    if (session?.user?.id) {
        const me = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { firstName: true, lastName: true, phone: true, email: true },
        })
        if (me) {
            const full = `${me.firstName ?? ""} ${me.lastName ?? ""}`.trim()
            if (full) senderName = full
            if (me.phone) senderPhone = me.phone
            if (me.email) senderEmail = me.email
        }
    }

    const contactName = deal.contact
        ? `${deal.contact.firstName ?? ""} ${deal.contact.lastName ?? ""}`.trim()
        : ""

    const endCustomer =
        withInn(deal.auctionCustomer) ||
        withInn(deal.sourceProject?.endCustomer) ||
        ""

    // Номер КП считается на сервере: версия растёт по уже созданным
    // предложениям сделки, чтобы файлы не выходили одноимёнными.
    const defaultNumber = await nextProposalNumber(prisma, deal.id)

    return (
        <ProposalView
            dealId={deal.id}
            defaultNumber={defaultNumber}
            buyer={withInn(deal.payer) || withInn(deal.counterparty)}
            endCustomer={endCustomer}
            contactName={contactName}
            contactEmail={deal.contact?.email || deal.counterparty?.email || ""}
            itemsCount={items.length}
            defaultDiscount={discountForProposal}
            defaultWeight={totalWeight}
            defaultVolume={totalVolume}
            senderName={senderName}
            senderPhone={senderPhone}
            senderEmail={senderEmail}
        />
    )
}
