"use client"
import { useRouter } from "next/navigation"
import { useState } from "react"
import {
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
    const [askReason, setAskReason] = useState(false)

    async function patch(next, extra = {}) {
        setLoading(true)
        const res = await fetch(`/api/crm/projects/${projectId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: next, ...extra }),
        })
        if (res.ok) {
            setStatus(next)
            setAskReason(false)
            toast.success("Статус обновлён")
            router.refresh()
        } else {
            const d = await res.json().catch(() => ({}))
            toast.error(d.error || "Не удалось сменить статус")
        }
        setLoading(false)
    }

    function change(next) {
        if (next === status) return
        // «Проработано, нет потребности» — сначала спрашиваем причину.
        if (next === "NO_NEED") {
            setAskReason(true)
            return
        }
        patch(next)
    }

    // Устаревший статус (WON/LOST/CANCELLED у старых записей) показываем,
    // но выбрать заново его нельзя.
    const options = PROJECT_STATUSES.includes(status)
        ? PROJECT_STATUSES
        : [status, ...PROJECT_STATUSES]

    return (
        <>
            <select
                value={status}
                onChange={e => change(e.target.value)}
                disabled={loading}
                title='Сменить статус проекта'
                className={`cursor-pointer appearance-none rounded-full border-0 bg-no-repeat px-3 py-1 pr-8 text-xs font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-brand_main/40 disabled:opacity-60 ${PROJECT_STATUS_COLORS[status] || ""}`}
                style={{
                    backgroundImage:
                        "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' fill='none' stroke='currentColor' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E\")",
                    backgroundPosition: "right 0.65rem center",
                    backgroundSize: "10px 6px",
                }}
            >
                {options.map(s => (
                    <option key={s} value={s} className='bg-white text-gray-900'>
                        {PROJECT_STATUS_LABELS[s] || s}
                    </option>
                ))}
            </select>

            {askReason && (
                <DealLossDialog
                    title='Почему у клиента нет потребности?'
                    confirmLabel='Проработано, нет потребности'
                    confirmClass='bg-amber-500 hover:bg-amber-600'
                    reasons={[]}
                    commentRequired
                    commentLabel='Причина'
                    commentPlaceholder='Например: закупились у другого поставщика на год вперёд'
                    saving={loading}
                    onCancel={() => setAskReason(false)}
                    onConfirm={({ lossComment }) => patch("NO_NEED", { lossComment })}
                />
            )}
        </>
    )
}
