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
import StatusSelect from "./StatusSelect"

export default function ProjectStatusControl({ projectId, currentStatus, readOnly = false }) {
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
            <StatusSelect
                value={status}
                options={options}
                labels={PROJECT_STATUS_LABELS}
                colors={PROJECT_STATUS_COLORS}
                disabled={loading || readOnly}
                title={
                    readOnly
                        ? "Статус этого проекта меняет только администратор"
                        : "Сменить статус проекта"
                }
                onChange={change}
            />

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
