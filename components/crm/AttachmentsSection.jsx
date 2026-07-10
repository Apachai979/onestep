"use client"
import { Fragment, useCallback, useEffect, useRef, useState } from "react"
import { LuPaperclip, LuUpload, LuTrash2 } from "react-icons/lu"
import { Section, useConfirm, useToast } from "@/components/crm/ui"
import { fileIconKey, formatBytes, isImageMime } from "@/lib/crm/attachment"
import {
    LuFile,
    LuFileText,
    LuFileImage,
    LuFileArchive,
} from "react-icons/lu"

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

function fullName(u) {
    if (!u) return "—"
    return `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email || "—"
}

function fmtDate(d) {
    return new Date(d).toLocaleDateString("ru-RU")
}

export default function AttachmentsSection({
    entityType,
    entityId,
    currentUserId,
    currentUserRole,
    bare = false,
    onCountChange,
}) {
    const toast = useToast()
    const confirm = useConfirm()
    const [items, setItems] = useState(null)
    const [uploading, setUploading] = useState(false)
    const [dragOver, setDragOver] = useState(false)
    const fileInputRef = useRef(null)

    const load = useCallback(async () => {
        try {
            const r = await fetch(
                `/api/crm/attachments?entityType=${entityType}&entityId=${entityId}`,
            )
            const data = await r.json()
            if (r.ok) setItems(data.items || [])
            else throw new Error(data?.error || `Ошибка ${r.status}`)
        } catch (err) {
            toast.error(err.message)
            setItems([])
        }
    }, [entityType, entityId, toast])

    useEffect(() => {
        load()
    }, [load])

    useEffect(() => {
        if (onCountChange && items) onCountChange(items.length)
    }, [items, onCountChange])

    async function uploadFiles(files) {
        if (!files?.length) return
        setUploading(true)
        try {
            const form = new FormData()
            form.append("entityType", entityType)
            form.append("entityId", entityId)
            for (const f of files) form.append("file", f)
            const r = await fetch("/api/crm/attachments", { method: "POST", body: form })
            const data = await r.json()
            if (!r.ok) {
                toast.error(data?.error || "Не удалось загрузить файл")
                return
            }
            setItems(prev => [...(data.items || []), ...(prev || [])])
            toast.success(
                data.items.length === 1
                    ? "Файл загружен"
                    : `Загружено файлов: ${data.items.length}`,
            )
        } finally {
            setUploading(false)
        }
    }

    function onFilesPicked(e) {
        const files = Array.from(e.target.files || [])
        e.target.value = ""
        uploadFiles(files)
    }

    function onDrop(e) {
        e.preventDefault()
        setDragOver(false)
        const files = Array.from(e.dataTransfer?.files || [])
        if (files.length) uploadFiles(files)
    }

    async function removeAttachment(att) {
        const ok = await confirm({
            title: "Удалить файл?",
            description: att.fileName,
            confirmText: "Удалить",
            variant: "danger",
        })
        if (!ok) return
        const r = await fetch(`/api/crm/attachments/${att.id}`, { method: "DELETE" })
        if (!r.ok) {
            const d = await r.json().catch(() => ({}))
            toast.error(d.error || "Не удалось удалить")
            return
        }
        setItems(prev => (prev || []).filter(x => x.id !== att.id))
        toast.success("Файл удалён")
    }

    function canDelete(att) {
        return att.uploadedBy?.id === currentUserId || currentUserRole === "ADMIN"
    }

    const Wrapper = bare ? Fragment : Section
    const wrapperProps = bare ? {} : { title: "Документы", icon: LuPaperclip }

    return (
        <Wrapper {...wrapperProps}>
            <div
                onDragOver={e => {
                    e.preventDefault()
                    setDragOver(true)
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`mb-4 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed py-6 text-center transition ${
                    dragOver
                        ? "border-brand_main bg-brand_main/5"
                        : "border-line hover:border-brand_main/60 hover:bg-surface_muted"
                }`}
            >
                <LuUpload className='mb-2 h-6 w-6 text-brand_main/70' />
                <p className='text-sm font-medium text-neutral-900'>
                    {uploading ? "Загружаем..." : "Перетащите файлы сюда или нажмите"}
                </p>
                <p className='mt-1 text-xs text-neutral-400'>
                    PDF, Word, Excel, изображения и др. До 25 МБ на файл
                </p>
                <input
                    type='file'
                    ref={fileInputRef}
                    onChange={onFilesPicked}
                    multiple
                    className='hidden'
                />
            </div>

            {items === null && (
                <p className='text-sm text-neutral-400'>Загрузка...</p>
            )}
            {items?.length === 0 && (
                <p className='text-sm text-neutral-400'>
                    Документов пока нет. Перетащите файлы сюда — карточка обзаведётся
                    архивом договоров, КП и переписки.
                </p>
            )}

            <ul className='grid grid-cols-1 gap-2 sm:grid-cols-2'>
                {items?.map(att => {
                    const key = fileIconKey(att.mimeType)
                    const Icon = ICONS[key]
                    const tone = TONES[key]
                    const inline = isImageMime(att.mimeType)
                    const href = `/api/crm/attachments/${att.id}/download${inline ? "?inline=1" : ""}`
                    return (
                        <li
                            key={att.id}
                            className='group flex items-center gap-3 rounded-lg border border-line bg-white p-3 transition hover:border-brand_main/40'
                        >
                            <span
                                className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tone}`}
                            >
                                <Icon className='h-5 w-5' />
                            </span>
                            <div className='min-w-0 flex-1'>
                                <a
                                    href={href}
                                    target={inline ? "_blank" : undefined}
                                    rel='noopener noreferrer'
                                    title={att.fileName}
                                    className='block truncate text-sm font-medium text-neutral-900 hover:text-brand_main'
                                >
                                    {att.fileName}
                                </a>
                                <p className='truncate text-[11px] text-neutral-400'>
                                    {formatBytes(att.size)} · {fullName(att.uploadedBy)} ·{" "}
                                    {fmtDate(att.createdAt)}
                                </p>
                            </div>
                            {canDelete(att) && (
                                <button
                                    type='button'
                                    onClick={() => removeAttachment(att)}
                                    className='inline-flex h-7 w-7 shrink-0 items-center justify-center rounded text-neutral-400 transition hover:bg-red-50 hover:text-red-600 md:opacity-0 md:group-hover:opacity-100'
                                    title='Удалить'
                                >
                                    <LuTrash2 className='h-3.5 w-3.5' />
                                </button>
                            )}
                        </li>
                    )
                })}
            </ul>
        </Wrapper>
    )
}
