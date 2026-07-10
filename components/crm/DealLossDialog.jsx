"use client"
import { useState } from "react"
import { DEAL_LOSS_REASONS, DEAL_LOSS_REASON_LABELS } from "@/lib/crm/deal"
import { Button } from "@/components/crm/ui"

// Диалог обязательной причины при проигрыше сделки/проекта.
// onConfirm({ lossReason, lossComment }) вызывается только с выбранной причиной.
// По умолчанию — тексты и причины для сделок; проектам передаются свои через props.
export default function DealLossDialog({
    dealTitle,
    onConfirm,
    onCancel,
    saving = false,
    title = "Почему сделка не реализована?",
    confirmLabel = "Сделка не реализована",
    reasons = DEAL_LOSS_REASONS,
    labels = DEAL_LOSS_REASON_LABELS,
    // Режим «только комментарий»: без списка причин, комментарий обязателен.
    commentRequired = false,
    commentLabel,
    commentPlaceholder = "Например: у конкурента цена ниже на 15%",
    confirmClass = "bg-red-600 hover:bg-red-700",
}) {
    const [reason, setReason] = useState("")
    const [comment, setComment] = useState("")
    const [error, setError] = useState("")

    const showReasons = reasons.length > 0

    function handleSubmit(e) {
        e.preventDefault()
        if (showReasons && !reason) {
            setError("Выберите причину")
            return
        }
        const trimmed = comment.trim()
        if (commentRequired && !trimmed) {
            setError("Укажите причину")
            return
        }
        onConfirm({ lossReason: reason || null, lossComment: trimmed || null })
    }

    return (
        <div
            className='fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 p-4 backdrop-blur-sm animate-apparition'
            onClick={onCancel}
        >
            <div
                onClick={e => e.stopPropagation()}
                className='w-full max-w-md rounded-2xl border border-line bg-white p-6 shadow-2xl shadow-neutral-900/20 animate-emersion'
            >
                <h2 className='mb-1 text-lg font-semibold text-neutral-900'>
                    {title}
                </h2>
                {dealTitle && (
                    <p className='mb-3 truncate text-sm text-neutral-500'>{dealTitle}</p>
                )}

                <form onSubmit={handleSubmit} className='space-y-3'>
                    {showReasons && (
                    <div className='space-y-1.5'>
                        {reasons.map(r => (
                            <label
                                key={r}
                                className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2 text-sm transition-colors ${
                                    reason === r
                                        ? "border-brand_main bg-brand_main/5 text-neutral-900"
                                        : "border-line text-neutral-600 hover:bg-surface_muted"
                                }`}
                            >
                                <input
                                    type='radio'
                                    name='lossReason'
                                    value={r}
                                    checked={reason === r}
                                    onChange={() => {
                                        setReason(r)
                                        setError("")
                                    }}
                                    className='accent-brand_main'
                                />
                                {labels[r]}
                            </label>
                        ))}
                    </div>
                    )}

                    <div>
                        <label className='mb-1.5 block text-xs font-medium text-neutral-500'>
                            {commentLabel ||
                                (commentRequired ? "Причина" : "Комментарий (необязательно)")}
                        </label>
                        <textarea
                            rows={commentRequired ? 3 : 2}
                            value={comment}
                            onChange={e => {
                                setComment(e.target.value)
                                setError("")
                            }}
                            placeholder={commentPlaceholder}
                            className='w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm transition-all duration-200 placeholder:text-neutral-400 focus:border-brand_main focus:outline-none focus:ring-2 focus:ring-brand_main/20'
                        />
                    </div>

                    {error && <p className='text-sm text-red-600'>{error}</p>}

                    <div className='flex justify-end gap-2'>
                        <Button type='button' variant='secondary' onClick={onCancel}>
                            Отмена
                        </Button>
                        <button
                            type='submit'
                            disabled={saving}
                            className={`inline-flex h-10 items-center rounded-xl px-4 text-sm font-semibold text-white shadow-sm transition-all duration-200 disabled:opacity-60 ${confirmClass}`}
                        >
                            {saving ? "Сохраняем..." : confirmLabel}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
