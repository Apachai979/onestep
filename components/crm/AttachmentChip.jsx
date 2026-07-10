"use client"
import {
    LuFile,
    LuFileText,
    LuFileImage,
    LuFileArchive,
    LuX,
} from "react-icons/lu"
import { fileIconKey, formatBytes, isImageMime } from "@/lib/crm/attachment"

const ICONS = {
    pdf: LuFileText,
    doc: LuFileText,
    xls: LuFileText,
    ppt: LuFileText,
    image: LuFileImage,
    zip: LuFileArchive,
    text: LuFileText,
    file: LuFile,
}

const TONES = {
    pdf: "bg-red-50 text-red-700",
    doc: "bg-blue-50 text-blue-700",
    xls: "bg-green-50 text-green-700",
    ppt: "bg-orange-50 text-orange-700",
    image: "bg-violet-50 text-violet-700",
    zip: "bg-amber-50 text-amber-800",
    text: "bg-surface_muted text-neutral-700",
    file: "bg-surface_muted text-neutral-700",
}

export default function AttachmentChip({ attachment, onRemove, compact = false }) {
    const key = fileIconKey(attachment.mimeType)
    const Icon = ICONS[key]
    const tone = TONES[key]
    const inline = isImageMime(attachment.mimeType)
    const href = `/api/crm/attachments/${attachment.id}/download${inline ? "?inline=1" : ""}`

    return (
        <div
            className={`group inline-flex max-w-full items-center gap-2 rounded-lg border border-line bg-white/80 ${
                compact ? "px-2 py-1" : "px-2.5 py-1.5"
            } text-xs shadow-sm`}
        >
            <span
                className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${tone}`}
            >
                <Icon className='h-3.5 w-3.5' />
            </span>
            <a
                href={href}
                target={inline ? "_blank" : undefined}
                rel='noopener noreferrer'
                title={attachment.fileName}
                onClick={e => e.stopPropagation()}
                className='min-w-0 flex-1 truncate text-neutral-900 hover:text-brand_main'
            >
                {attachment.fileName}
            </a>
            <span className='shrink-0 text-neutral-400'>{formatBytes(attachment.size)}</span>
            {onRemove && (
                <button
                    type='button'
                    onClick={e => {
                        e.stopPropagation()
                        onRemove(attachment.id)
                    }}
                    className='inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-neutral-400 hover:bg-red-50 hover:text-red-600'
                    title='Удалить'
                >
                    <LuX className='h-3 w-3' />
                </button>
            )}
        </div>
    )
}
