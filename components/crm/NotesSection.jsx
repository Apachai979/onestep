"use client"
import { useCallback, useEffect, useRef, useState } from "react"
import {
    LuMessageSquare,
    LuPaperclip,
    LuPencil,
    LuPin,
    LuPinOff,
    LuSend,
    LuTrash2,
} from "react-icons/lu"
import { Section, useConfirm, useToast } from "@/components/crm/ui"
import { Fragment } from "react"
import AttachmentChip from "./AttachmentChip"

function safeJson(text) {
    try {
        return JSON.parse(text)
    } catch {
        return null
    }
}

function initials(u) {
    const src = `${u?.firstName ?? ""} ${u?.lastName ?? ""}`.trim() || u?.email || ""
    if (!src) return "?"
    const parts = src.split(/[\s.@]+/).filter(Boolean)
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[1][0]).toUpperCase()
}

function fullName(u) {
    if (!u) return "—"
    return `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email || "—"
}

function fmtRelative(d) {
    const ms = Date.now() - new Date(d).getTime()
    const min = Math.floor(ms / 60_000)
    if (min < 1) return "только что"
    if (min < 60) return `${min} мин`
    const h = Math.floor(min / 60)
    if (h < 24) return `${h} ч`
    const days = Math.floor(h / 24)
    if (days < 7) return `${days} дн`
    return new Date(d).toLocaleDateString("ru-RU")
}

export default function NotesSection({
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
    const [body, setBody] = useState("")
    const [pendingFiles, setPendingFiles] = useState([])
    const [uploading, setUploading] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [editingId, setEditingId] = useState(null)
    const [editingBody, setEditingBody] = useState("")
    const fileInputRef = useRef(null)

    const load = useCallback(async () => {
        try {
            const r = await fetch(
                `/api/crm/notes?entityType=${entityType}&entityId=${entityId}`,
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

    function canMutate(note) {
        return note.author?.id === currentUserId || currentUserRole === "ADMIN"
    }

    async function uploadFiles(files) {
        if (!files?.length) return []
        setUploading(true)
        try {
            const form = new FormData()
            // upload to entity first; will reassign to note on creation
            form.append("entityType", entityType)
            form.append("entityId", entityId)
            for (const f of files) form.append("file", f)
            const r = await fetch("/api/crm/attachments", { method: "POST", body: form })
            const data = await r.json()
            if (!r.ok) {
                toast.error(data?.error || "Не удалось загрузить файл")
                return []
            }
            return data.items || []
        } finally {
            setUploading(false)
        }
    }

    async function onAttachClick() {
        fileInputRef.current?.click()
    }

    async function onFilesPicked(e) {
        const files = Array.from(e.target.files || [])
        e.target.value = ""
        if (!files.length) return
        const uploaded = await uploadFiles(files)
        setPendingFiles(prev => [...prev, ...uploaded])
    }

    async function removePending(id) {
        await fetch(`/api/crm/attachments/${id}`, { method: "DELETE" })
        setPendingFiles(prev => prev.filter(a => a.id !== id))
    }

    async function submit(e) {
        e.preventDefault()
        const text = body.trim()
        if (!text && pendingFiles.length === 0) return
        setSubmitting(true)
        try {
            const r = await fetch("/api/crm/notes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    entityType,
                    entityId,
                    body: text || "(файлы)",
                    attachmentIds: pendingFiles.map(f => f.id),
                }),
            })
            const data = await r.json()
            if (!r.ok) {
                toast.error(data?.error || "Не удалось добавить")
                return
            }
            setBody("")
            setPendingFiles([])
            setItems(prev => [data.item, ...(prev || [])])
        } finally {
            setSubmitting(false)
        }
    }

    async function togglePin(note) {
        const r = await fetch(`/api/crm/notes/${note.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pinned: !note.pinned }),
        })
        if (!r.ok) {
            const d = await r.json().catch(() => ({}))
            toast.error(d.error || "Не удалось")
            return
        }
        const data = await r.json()
        setItems(prev =>
            (prev || [])
                .map(n => (n.id === note.id ? data.item : n))
                .sort((a, b) => {
                    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
                    return new Date(b.createdAt) - new Date(a.createdAt)
                }),
        )
    }

    function startEdit(note) {
        setEditingId(note.id)
        setEditingBody(note.body)
    }

    function cancelEdit() {
        setEditingId(null)
        setEditingBody("")
    }

    async function saveEdit(note) {
        const text = editingBody.trim()
        if (!text) {
            toast.error("Текст не может быть пустым")
            return
        }
        const r = await fetch(`/api/crm/notes/${note.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ body: text }),
        })
        if (!r.ok) {
            const d = await r.json().catch(() => ({}))
            toast.error(d.error || "Не удалось сохранить")
            return
        }
        const data = await r.json()
        setItems(prev => (prev || []).map(n => (n.id === note.id ? data.item : n)))
        cancelEdit()
        toast.success("Заметка обновлена")
    }

    async function deleteNote(note) {
        const ok = await confirm({
            title: "Удалить заметку?",
            description: "Действие нельзя отменить. Прикреплённые файлы тоже удалятся.",
            confirmText: "Удалить",
            variant: "danger",
        })
        if (!ok) return
        const r = await fetch(`/api/crm/notes/${note.id}`, { method: "DELETE" })
        if (!r.ok) {
            const d = await r.json().catch(() => ({}))
            toast.error(d.error || "Не удалось удалить")
            return
        }
        setItems(prev => (prev || []).filter(n => n.id !== note.id))
        toast.success("Заметка удалена")
    }

    const Wrapper = bare ? Fragment : Section
    const wrapperProps = bare ? {} : { title: "Заметки", icon: LuMessageSquare }

    return (
        <Wrapper {...wrapperProps}>
            <form onSubmit={submit} className='mb-4'>
                <textarea
                    value={body}
                    onChange={e => setBody(e.target.value)}
                    rows={2}
                    placeholder='Оставьте заметку — будет видна вашим коллегам в этой карточке'
                    className='w-full resize-none rounded-lg border border-line bg-white px-3 py-2 text-sm shadow-sm focus:border-brand_main focus:outline-none'
                />
                {pendingFiles.length > 0 && (
                    <div className='mt-2 flex flex-wrap gap-1.5'>
                        {pendingFiles.map(a => (
                            <AttachmentChip
                                key={a.id}
                                attachment={a}
                                onRemove={removePending}
                                compact
                            />
                        ))}
                    </div>
                )}
                <div className='mt-2 flex items-center justify-between gap-2'>
                    <button
                        type='button'
                        onClick={onAttachClick}
                        disabled={uploading}
                        className='inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs text-neutral-900/75 hover:bg-surface_muted disabled:opacity-50'
                    >
                        <LuPaperclip className='h-3.5 w-3.5' />
                        {uploading ? "Загружаем..." : "Прикрепить файл"}
                    </button>
                    <input
                        type='file'
                        ref={fileInputRef}
                        onChange={onFilesPicked}
                        multiple
                        className='hidden'
                    />
                    <button
                        type='submit'
                        disabled={submitting || uploading || (!body.trim() && pendingFiles.length === 0)}
                        className='inline-flex items-center gap-1.5 rounded-lg bg-brand_main px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-brand_main/90 disabled:opacity-50'
                    >
                        <LuSend className='h-3.5 w-3.5' />
                        Опубликовать
                    </button>
                </div>
            </form>

            {items === null && (
                <p className='text-sm text-neutral-400'>Загрузка...</p>
            )}
            {items?.length === 0 && (
                <p className='text-sm text-neutral-400'>
                    Заметок пока нет. Будьте первым!
                </p>
            )}

            <ul className='space-y-3'>
                {items?.map(n => {
                    const mutable = canMutate(n)
                    const editing = editingId === n.id
                    return (
                        <li
                            key={n.id}
                            className={`rounded-lg border p-3 ${
                                n.pinned
                                    ? "border-amber-200 bg-amber-50/50"
                                    : "border-line bg-white"
                            }`}
                        >
                            <div className='flex items-start gap-3'>
                                <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand_main text-white text-xs font-semibold'>
                                    {initials(n.author)}
                                </div>
                                <div className='min-w-0 flex-1'>
                                    <div className='flex flex-wrap items-center gap-2 text-xs'>
                                        <span className='font-medium text-neutral-900'>
                                            {fullName(n.author)}
                                        </span>
                                        <span className='text-neutral-400'>
                                            {fmtRelative(n.createdAt)}
                                        </span>
                                        {n.createdAt !== n.updatedAt && (
                                            <span className='italic text-neutral-400'>
                                                · изменено
                                            </span>
                                        )}
                                        {n.pinned && (
                                            <span className='inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800'>
                                                <LuPin className='h-2.5 w-2.5' />
                                                Закреплено
                                            </span>
                                        )}
                                    </div>
                                    {editing ? (
                                        <div className='mt-2'>
                                            <textarea
                                                value={editingBody}
                                                onChange={e => setEditingBody(e.target.value)}
                                                rows={3}
                                                className='w-full rounded-lg border border-line bg-white px-3 py-2 text-sm shadow-sm focus:border-brand_main focus:outline-none'
                                                autoFocus
                                            />
                                            <div className='mt-2 flex justify-end gap-2'>
                                                <button
                                                    type='button'
                                                    onClick={cancelEdit}
                                                    className='rounded-lg border border-line px-3 py-1 text-xs text-neutral-900/75 hover:bg-surface_muted'
                                                >
                                                    Отмена
                                                </button>
                                                <button
                                                    type='button'
                                                    onClick={() => saveEdit(n)}
                                                    className='rounded-lg bg-brand_main px-3 py-1 text-xs font-semibold text-white hover:bg-brand_main/90'
                                                >
                                                    Сохранить
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className='mt-1 whitespace-pre-wrap break-words text-sm text-neutral-700'>
                                            {n.body}
                                        </p>
                                    )}
                                    {n.attachments?.length > 0 && !editing && (
                                        <div className='mt-2 flex flex-wrap gap-1.5'>
                                            {n.attachments.map(a => (
                                                <AttachmentChip
                                                    key={a.id}
                                                    attachment={a}
                                                    compact
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                                {!editing && (
                                    <div className='flex shrink-0 gap-1 text-neutral-400'>
                                        <button
                                            type='button'
                                            onClick={() => togglePin(n)}
                                            title={n.pinned ? "Открепить" : "Закрепить"}
                                            className='inline-flex h-6 w-6 items-center justify-center rounded hover:bg-surface_muted hover:text-neutral-900'
                                        >
                                            {n.pinned ? (
                                                <LuPinOff className='h-3.5 w-3.5' />
                                            ) : (
                                                <LuPin className='h-3.5 w-3.5' />
                                            )}
                                        </button>
                                        {mutable && (
                                            <>
                                                <button
                                                    type='button'
                                                    onClick={() => startEdit(n)}
                                                    title='Изменить'
                                                    className='inline-flex h-6 w-6 items-center justify-center rounded hover:bg-surface_muted hover:text-neutral-900'
                                                >
                                                    <LuPencil className='h-3.5 w-3.5' />
                                                </button>
                                                <button
                                                    type='button'
                                                    onClick={() => deleteNote(n)}
                                                    title='Удалить'
                                                    className='inline-flex h-6 w-6 items-center justify-center rounded hover:bg-red-50 hover:text-red-600'
                                                >
                                                    <LuTrash2 className='h-3.5 w-3.5' />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        </li>
                    )
                })}
            </ul>
        </Wrapper>
    )
}
