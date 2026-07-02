import fs from "fs"
import path from "path"
import prisma from "@/lib/client"
import { requireCrmSession } from "@/lib/crm/session"
import { rublesToWords } from "@/lib/crm/number-to-words"
import { renderProposalPdf } from "@/lib/crm/proposal-pdf"

const SELLER = {
    name: "ООО «OneStep»",
    address: "634015, Томская область, г. Томск, ул. Циолковского, 19/1, пом. 24",
    phones: "+7 (495) 231-01-11 · +7 (985) 231-01-11",
    email: "info@onestep.su",
    site: "www.onestep.su",
}

function toNum(v) {
    if (v === null || v === undefined) return 0
    const s = typeof v === "object" && v.toString ? v.toString() : String(v)
    const n = Number(s.replace(",", "."))
    return Number.isFinite(n) ? n : 0
}

let LOGO_DATA_URL = null
function readLogoOnce() {
    if (LOGO_DATA_URL) return LOGO_DATA_URL
    try {
        const buf = fs.readFileSync(
            path.join(process.cwd(), "public/logo_name.png"),
        )
        LOGO_DATA_URL = `data:image/png;base64,${buf.toString("base64")}`
    } catch {
        LOGO_DATA_URL = null
    }
    return LOGO_DATA_URL
}

function fmtInputDate(iso) {
    if (!iso) return ""
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return String(iso)
    const dd = String(d.getDate()).padStart(2, "0")
    const mm = String(d.getMonth() + 1).padStart(2, "0")
    return `${dd}.${mm}.${d.getFullYear()}`
}

export async function POST(request, { params }) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    let body
    try {
        body = await request.json()
    } catch {
        return Response.json({ error: "Некорректный JSON" }, { status: 400 })
    }

    const deal = await prisma.deal.findUnique({
        where: { id: params.id },
        include: {
            counterparty: true,
            items: { orderBy: { createdAt: "asc" } },
        },
    })
    if (!deal) return Response.json({ error: "Сделка не найдена" }, { status: 404 })

    const itemsWithProduct = await prisma.dealItem.findMany({
        where: { dealId: deal.id },
        orderBy: { createdAt: "asc" },
        include: {
            product: {
                select: {
                    sku: true,
                    category: true,
                    transportPackQty: true,
                    contents: true,
                },
            },
        },
    })

    const items = itemsWithProduct.map((it, i) => {
        const qty = toNum(it.quantity)
        const amount = toNum(it.amount)
        const unitPrice = qty > 0 ? amount / qty : 0
        const packQty = it.product?.transportPackQty || 0
        const packs = packQty > 0 ? qty / packQty : null
        const packPrice = packQty > 0 ? unitPrice * packQty : null
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
        }
    })

    const subtotal = items.reduce((s, x) => s + x.amount, 0)
    const discountPct = Math.max(
        0,
        Math.min(100, Number(body.discount) || 0),
    )
    const discountAmount = (subtotal * discountPct) / 100
    const finalAmount = subtotal - discountAmount
    const vatRate = Math.max(0, Math.min(100, Number(body.vatRate) || 0))
    const vatAmount = vatRate > 0 ? (finalAmount * vatRate) / (100 + vatRate) : 0

    const totals = {
        sub: subtotal,
        discountPct,
        discountAmount,
        finalAmount,
        vatRate,
        vatAmount,
        words: rublesToWords(finalAmount),
    }

    const number = String(body.number || "").trim() || `${deal.id.slice(-4).toUpperCase()}/1`
    const dateText = fmtInputDate(body.date) || fmtInputDate(new Date().toISOString())

    const docData = {
        seller: SELLER,
        logoSrc: readLogoOnce(),
        number,
        date: dateText,
        validDays: Number(body.validDays) || 60,
        buyer: String(body.buyer || deal.counterparty.name || "").trim(),
        deliveryTerm: String(body.deliveryTerm || "").trim(),
        paymentTerm: String(body.paymentTerm || "").trim(),
        deliveryCondition: String(body.deliveryCondition || "").trim(),
        intro:
            String(body.intro || "").trim() ||
            `Компания ${SELLER.name} предлагает вашему вниманию коммерческое предложение на поставку следующей продукции:`,
        items,
        totals,
        volume: String(body.volume || "").trim(),
        weight: String(body.weight || "").trim(),
        senderName: String(body.senderName || "").trim(),
        senderPhone: String(body.senderPhone || "").trim(),
        senderEmail: String(body.senderEmail || "").trim(),
    }

    let buffer
    try {
        buffer = await renderProposalPdf(docData)
    } catch (err) {
        console.error("[proposal/pdf] render error:", err)
        return Response.json(
            { error: `Ошибка PDF: ${err.message}`, detail: err.stack },
            { status: 500 },
        )
    }

    const fileName = `Коммерческое предложение № ${number} от ${dateText}.pdf`

    return new Response(buffer, {
        headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
            "Cache-Control": "no-store",
        },
    })
}
