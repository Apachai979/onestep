import { notFound, redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/configs/auth"
import prisma from "@/lib/client"
import ProposalView from "@/components/crm/ProposalView"
import { isDealLocked } from "@/lib/crm/access"

export const metadata = { title: "Коммерческое предложение | CRM" }

function toNum(v) {
    if (v === null || v === undefined) return 0
    const s = typeof v === "object" && v.toString ? v.toString() : String(v)
    const n = Number(s.replace(",", "."))
    return Number.isFinite(n) ? n : 0
}

export default async function ProposalPage({ params }) {
    const session = await getServerSession(authOptions)

    const deal = await prisma.deal.findUnique({
        where: { id: params.id },
        include: {
            counterparty: true,
            contact: true,
            manager: true,
            // Конечный потребитель для КП берётся из проекта-источника,
            // а для сделок из аукциона — из проекта этого аукциона.
            sourceProject: { include: { endCustomer: { select: { name: true } } } },
            sourceAuction: {
                include: {
                    project: { include: { endCustomer: { select: { name: true } } } },
                },
            },
        },
    })
    if (!deal) notFound()

    if (isDealLocked(deal.status, session)) {
        redirect(`/crm/deals/${deal.id}`)
    }

    const items = await prisma.dealItem.findMany({
        where: { dealId: deal.id },
        orderBy: { createdAt: "asc" },
        include: {
            product: {
                select: {
                    id: true,
                    sku: true,
                    name: true,
                    category: true,
                    transportPackQty: true,
                    contents: true,
                    unitWeightKg: true,
                    unitVolumeM3: true,
                },
            },
        },
    })

    const itemsForClient = items.map((it, i) => {
        const qty = toNum(it.quantity)
        const amount = toNum(it.amount)
        const unitPrice = qty > 0 ? amount / qty : 0
        const packQty = it.product?.transportPackQty || 0
        const packs = packQty > 0 ? qty / packQty : null
        const packPrice = packQty > 0 ? unitPrice * packQty : null
        const unitWeight = toNum(it.product?.unitWeightKg)
        const unitVolume = toNum(it.product?.unitVolumeM3)
        return {
            n: i + 1,
            sku: it.sku || it.product?.sku || "",
            name: it.product?.category || it.name,
            contents: it.product?.contents || "",
            qty,
            unitPrice,
            packQty: packQty || null,
            packPrice,
            packs: packs !== null && Number.isFinite(packs) ? packs : null,
            amount,
            unitWeight,
            unitVolume,
        }
    })

    const subtotal = itemsForClient.reduce((s, x) => s + x.amount, 0)
    const totalWeight = itemsForClient.reduce((s, x) => s + x.unitWeight * x.qty, 0)
    const totalVolume = itemsForClient.reduce((s, x) => s + x.unitVolume * x.qty, 0)
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
        deal.sourceProject?.endCustomer?.name ||
        deal.sourceAuction?.project?.endCustomer?.name ||
        ""

    return (
        <ProposalView
            dealId={deal.id}
            buyer={deal.counterparty.name}
            endCustomer={endCustomer}
            contactName={contactName}
            contactEmail={deal.contact?.email || deal.counterparty?.email || ""}
            items={itemsForClient}
            subtotal={subtotal}
            defaultDiscount={discountForProposal}
            defaultWeight={totalWeight}
            defaultVolume={totalVolume}
            senderName={senderName}
            senderPhone={senderPhone}
            senderEmail={senderEmail}
        />
    )
}
