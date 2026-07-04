import { requireCrmSession } from "@/lib/crm/session"
import { buildProposalDoc } from "@/lib/crm/proposal-doc"
import { renderProposalPdf } from "@/lib/crm/proposal-pdf"

export async function POST(request, { params }) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    let body
    try {
        body = await request.json()
    } catch {
        return Response.json({ error: "Некорректный JSON" }, { status: 400 })
    }

    const built = await buildProposalDoc(params.id, body)
    if (built.error) {
        return Response.json({ error: built.error }, { status: built.status || 400 })
    }

    let buffer
    try {
        buffer = await renderProposalPdf(built.docData)
    } catch (err) {
        console.error("[proposal/pdf] render error:", err)
        return Response.json(
            { error: `Ошибка PDF: ${err.message}`, detail: err.stack },
            { status: 500 },
        )
    }

    return new Response(buffer, {
        headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(built.fileName)}`,
            "Cache-Control": "no-store",
        },
    })
}
