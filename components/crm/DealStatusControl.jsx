"use client"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { DEAL_STATUSES, DEAL_STATUS_COLORS, DEAL_STATUS_LABELS } from "@/lib/crm/deal"

export default function DealStatusControl({ dealId, currentStatus }) {
    const router = useRouter()
    const [status, setStatus] = useState(currentStatus)
    const [loading, setLoading] = useState(false)

    async function change(next) {
        if (next === status) return
        setLoading(true)
        const res = await fetch(`/api/crm/deals/${dealId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: next }),
        })
        if (res.ok) {
            setStatus(next)
            router.refresh()
        } else {
            const d = await res.json().catch(() => ({}))
            alert(d.error || "Не удалось сменить статус")
        }
        setLoading(false)
    }

    return (
        <div className='flex flex-wrap items-center gap-2'>
            <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${DEAL_STATUS_COLORS[status]}`}
            >
                {DEAL_STATUS_LABELS[status]}
            </span>
            <select
                value={status}
                onChange={e => change(e.target.value)}
                disabled={loading}
                className='rounded-lg border border-gray-300 bg-white px-3 py-1 text-xs shadow-sm focus:border-primary_green focus:outline-none disabled:opacity-60'
            >
                {DEAL_STATUSES.map(s => (
                    <option key={s} value={s}>
                        {DEAL_STATUS_LABELS[s]}
                    </option>
                ))}
            </select>
        </div>
    )
}
