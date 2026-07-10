"use client"
import { useRouter } from "next/navigation"
import { useRef, useState } from "react"
import { LuFileText, LuUpload } from "react-icons/lu"
import { formatBytes } from "@/lib/crm/attachment"
import { useConfirm, useToast } from "@/components/crm/ui"

// Итоговый протокол аукциона: файл хранится обычным вложением
// (entityType Auction), его id — в auction.protocolAttachmentId.
export default function AuctionProtocolSection({ auctionId, protocol }) {
    const router = useRouter()
    const toast = useToast()
    const confirm = useConfirm()
    const inputRef = useRef(null)
    const [uploading, setUploading] = useState(false)

    async function upload(file) {
        if (!file) return
        setUploading(true)
        const fd = new FormData()
        fd.append("entityType", "Auction")
        fd.append("entityId", auctionId)
        fd.append("file", file)
        const res = await fetch("/api/crm/attachments", { method: "POST", body: fd })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
            toast.error(data.error || "Не удалось загрузить файл")
            setUploading(false)
            return
        }
        const attId = data.items?.[0]?.id
        if (attId) {
            await fetch(`/api/crm/auctions/${auctionId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ protocolAttachmentId: attId }),
            })
        }
        toast.success("Протокол прикреплён")
        setUploading(false)
        router.refresh()
    }

    async function remove() {
        const ok = await confirm({
            title: "Открепить протокол?",
            description: protocol?.fileName,
            confirmText: "Открепить",
            variant: "danger",
        })
        if (!ok) return
        await fetch(`/api/crm/auctions/${auctionId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ protocolAttachmentId: null }),
        })
        toast.success("Протокол откреплён (файл остался в «Документах»)")
        router.refresh()
    }

    return (
        <section className='rounded-2xl border border-line bg-white p-6 shadow-sm'>
            <div className='mb-4 flex items-center justify-between gap-2'>
                <h2 className='text-sm font-semibold text-neutral-900'>
                    Итоговый протокол
                </h2>
                <button
                    type='button'
                    onClick={() => inputRef.current?.click()}
                    disabled={uploading}
                    className='inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:bg-surface_muted disabled:opacity-60'
                >
                    <LuUpload className='h-3.5 w-3.5' />
                    {uploading ? "Загружаем..." : protocol ? "Заменить" : "Прикрепить файл"}
                </button>
                <input
                    ref={inputRef}
                    type='file'
                    className='hidden'
                    onChange={e => {
                        upload(e.target.files?.[0])
                        e.target.value = ""
                    }}
                />
            </div>

            {protocol ? (
                <div className='flex items-center justify-between gap-3 rounded-xl border border-line bg-surface_muted px-3 py-2'>
                    <a
                        href={`/api/crm/attachments/${protocol.id}/download`}
                        className='flex min-w-0 items-center gap-2 text-sm font-medium text-brand_main hover:underline'
                    >
                        <LuFileText className='h-4 w-4 shrink-0' />
                        <span className='truncate'>{protocol.fileName}</span>
                        <span className='shrink-0 text-xs font-normal text-neutral-400'>
                            {formatBytes(protocol.size)}
                        </span>
                    </a>
                    <button
                        type='button'
                        onClick={remove}
                        className='shrink-0 rounded-lg border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50'
                    >
                        Открепить
                    </button>
                </div>
            ) : (
                <p className='text-sm text-neutral-500'>
                    Протокол ещё не прикреплён. После подведения итогов прикрепите итоговый
                    протокол аукциона.
                </p>
            )}
        </section>
    )
}
