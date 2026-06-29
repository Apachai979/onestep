import prisma from "@/lib/client"
import { requireCrmSession } from "@/lib/crm/session"
import { openReadStream, statFile } from "@/lib/crm/storage/local"
import { isImageMime } from "@/lib/crm/attachment"

function asciiFallback(name) {
    return String(name || "file").replace(/[^\x20-\x7E]+/g, "_")
}

export async function GET(request, { params }) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    const att = await prisma.attachment.findUnique({ where: { id: params.id } })
    if (!att) return Response.json({ error: "Не найдено" }, { status: 404 })

    let stat
    try {
        stat = await statFile(att.storageKey)
    } catch {
        return Response.json({ error: "Файл недоступен" }, { status: 410 })
    }

    const { searchParams } = new URL(request.url)
    const inline = searchParams.get("inline") === "1" && isImageMime(att.mimeType)
    const disposition = inline ? "inline" : "attachment"
    const encoded = encodeURIComponent(att.fileName)

    const nodeStream = openReadStream(att.storageKey)
    const stream = new ReadableStream({
        start(controller) {
            nodeStream.on("data", chunk => controller.enqueue(chunk))
            nodeStream.on("end", () => controller.close())
            nodeStream.on("error", err => controller.error(err))
        },
        cancel() {
            nodeStream.destroy()
        },
    })

    return new Response(stream, {
        headers: {
            "Content-Type": att.mimeType || "application/octet-stream",
            "Content-Length": String(stat.size),
            "Content-Disposition": `${disposition}; filename="${asciiFallback(att.fileName)}"; filename*=UTF-8''${encoded}`,
            "Cache-Control": "private, max-age=0, no-store",
        },
    })
}
