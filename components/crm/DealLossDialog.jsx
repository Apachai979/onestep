"use client"
import { useState } from "react"
import { DEAL_LOSS_REASONS, DEAL_LOSS_REASON_LABELS } from "@/lib/crm/deal"

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
}) {
    const [reason, setReason] = useState("")
    const [comment, setComment] = useState("")
    const [error, setError] = useState("")

    function handleSubmit(e) {
        e.preventDefault()
        if (!reason) {
            setError("Выберите причину")
            return
        }
        onConfirm({ lossReason: reason, lossComment: comment.trim() || null })
    }

    return (
        <div
            className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4'
            onClick={onCancel}
        >
            <div
                onClick={e => e.stopPropagation()}
                className='w-full max-w-md rounded-xl bg-white p-5 shadow-2xl'
            >
                <h2 className='mb-1 text-lg font-semibold text-night_green'>
                    {title}
                </h2>
                {dealTitle && (
                    <p className='mb-3 truncate text-sm text-night_green/60'>{dealTitle}</p>
                )}

                <form onSubmit={handleSubmit} className='space-y-3'>
                    <div className='space-y-1.5'>
                        {reasons.map(r => (
                            <label
                                key={r}
                                className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-sm transition ${
                                    reason === r
                                        ? "border-brand_main bg-brand_main/5 text-night_green"
                                        : "border-brand_soft/50 text-gray-700 hover:bg-brand_soft/15"
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
                                    className='accent-primary_green'
                                />
                                {labels[r]}
                            </label>
                        ))}
                    </div>

                    <div>
                        <label className='mb-1 block text-xs text-gray-600'>
                            Комментарий (необязательно)
                        </label>
                        <textarea
                            rows={2}
                            value={comment}
                            onChange={e => setComment(e.target.value)}
                            placeholder='Например: у конкурента цена ниже на 15%'
                            className='w-full rounded-lg border border-brand_soft/60 px-3 py-2 text-sm shadow-sm focus:border-brand_main focus:outline-none'
                        />
                    </div>

                    {error && <p className='text-sm text-red-600'>{error}</p>}

                    <div className='flex justify-end gap-2'>
                        <button
                            type='button'
                            onClick={onCancel}
                            className='rounded-lg border border-brand_soft/60 px-4 py-2 text-sm text-gray-700 hover:bg-brand_soft/30'
                        >
                            Отмена
                        </button>
                        <button
                            type='submit'
                            disabled={saving}
                            className='rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-60'
                        >
                            {saving ? "Сохраняем..." : confirmLabel}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
