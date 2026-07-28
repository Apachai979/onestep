import { requireCrmSession } from "@/lib/crm/session"
import { buildProposalDoc } from "@/lib/crm/proposal-doc"
import { renderProposalXlsx } from "@/lib/crm/proposal-xlsx"
import { xlsxResponse } from "@/lib/crm/excel"

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
        buffer = await renderProposalXlsx(built.docData)
    } catch (err) {
        console.error("[proposal/xlsx] render error:", err)
        return Response.json({ error: `Ошибка Excel: ${err.message}` }, { status: 500 })
    }

    // buildProposalDoc отдаёт имя с .pdf — для Excel подменяем расширение.
    const fileName = built.fileName.replace(/\.pdf$/i, ".xlsx")
    return xlsxResponse(buffer, fileName)
}
