"use client"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { PROJECT_STATUSES, PROJECT_STATUS_LABELS } from "@/lib/crm/project"

const STATUS_CLASS = {
    IN_PROGRESS: "bg-blue-100 text-blue-800",
    COMPLETED: "bg-green-100 text-green-800",
    CANCELLED: "bg-gray-200 text-gray-700",
}

export default function ProjectStatusControl({ projectId, currentStatus }) {
    const router = useRouter()
    const [status, setStatus] = useState(currentStatus)
    const [loading, setLoading] = useState(false)

    async function change(next) {
        if (next === status) return
        setLoading(true)
        const res = await fetch(`/api/crm/projects/${projectId}`, {
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
                className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_CLASS[status] || ""}`}
            >
                {PROJECT_STATUS_LABELS[status]}
            </span>
            <select
                value={status}
                onChange={e => change(e.target.value)}
                disabled={loading}
                className='rounded-lg border border-gray-300 bg-white px-3 py-1 text-xs shadow-sm focus:border-primary_green focus:outline-none disabled:opacity-60'
            >
                {PROJECT_STATUSES.map(s => (
                    <option key={s} value={s}>
                        {PROJECT_STATUS_LABELS[s]}
                    </option>
                ))}
            </select>
        </div>
    )
}
