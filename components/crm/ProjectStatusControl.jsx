"use client"
import { useRouter } from "next/navigation"
import { useState } from "react"
import {
    PROJECT_LOSS_REASONS,
    PROJECT_LOSS_REASON_LABELS,
    PROJECT_STATUSES,
    PROJECT_STATUS_COLORS,
    PROJECT_STATUS_LABELS,
} from "@/lib/crm/project"
import { useToast } from "@/components/crm/ui"
import DealLossDialog from "./DealLossDialog"

export default function ProjectStatusControl({ projectId, currentStatus }) {
    const router = useRouter()
    const toast = useToast()
    const [status, setStatus] = useState(currentStatus)
    const [loading, setLoading] = useState(false)
    const [losing, setLosing] = useState(false)

    async function patch(payload) {
        setLoading(true)
        const res = await fetch(`/api/crm/projects/${projectId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        })
        if (res.ok) {
            setStatus(payload.status)
            toast.success("Статус обновлён")
            router.refresh()
        } else {
            const d = await res.json().catch(() => ({}))
            toast.error(d.error || "Не удалось сменить статус")
        }
        setLoading(false)
        return res.ok
    }

    function change(next) {
        if (next === status) return
        // Проигрыш аукциона — только с указанием причины.
        if (next === "LOST") {
            setLosing(true)
            return
        }
        patch({ status: next })
    }

    return (
        <>
            <select
                value={status}
                onChange={e => change(e.target.value)}
                disabled={loading}
                title='Сменить статус проекта'
                className={`cursor-pointer appearance-none rounded-full border-0 bg-no-repeat px-3 py-1 pr-8 text-xs font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-primary_green/50 disabled:opacity-60 ${PROJECT_STATUS_COLORS[status] || ""}`}
                style={{
                    backgroundImage:
                        "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' fill='none' stroke='currentColor' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E\")",
                    backgroundPosition: "right 0.65rem center",
                    backgroundSize: "10px 6px",
                }}
            >
                {PROJECT_STATUSES.map(s => (
                    <option key={s} value={s} className='bg-white text-gray-900'>
                        {PROJECT_STATUS_LABELS[s]}
                    </option>
                ))}
            </select>

            {losing && (
                <DealLossDialog
                    saving={loading}
                    title='Почему проект проигран?'
                    confirmLabel='Проект проигран'
                    reasons={PROJECT_LOSS_REASONS}
                    labels={PROJECT_LOSS_REASON_LABELS}
                    onCancel={() => setLosing(false)}
                    onConfirm={async ({ lossReason, lossComment }) => {
                        const ok = await patch({
                            status: "LOST",
                            lossReason,
                            lossComment,
                        })
                        if (ok) setLosing(false)
                    }}
                />
            )}
        </>
    )
}
