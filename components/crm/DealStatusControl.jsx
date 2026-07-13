"use client"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { DEAL_STATUSES, DEAL_STATUS_COLORS, DEAL_STATUS_LABELS } from "@/lib/crm/deal"
import { useToast } from "@/components/crm/ui"
import DealLossDialog from "./DealLossDialog"
import StatusSelect from "./StatusSelect"

export default function DealStatusControl({ dealId, currentStatus }) {
    const router = useRouter()
    const toast = useToast()
    const [status, setStatus] = useState(currentStatus)
    const [loading, setLoading] = useState(false)
    const [losing, setLosing] = useState(false)

    async function patch(payload) {
        setLoading(true)
        const res = await fetch(`/api/crm/deals/${dealId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        })
        if (res.ok) {
            setStatus(payload.status)
            toast.success("Статус сделки обновлён")
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
        // Проигрыш — только с указанием причины.
        if (next === "CANCELLED") {
            setLosing(true)
            return
        }
        patch({ status: next })
    }

    return (
        <>
            <StatusSelect
                value={status}
                options={DEAL_STATUSES}
                labels={DEAL_STATUS_LABELS}
                colors={DEAL_STATUS_COLORS}
                disabled={loading}
                title='Сменить статус сделки'
                onChange={change}
            />

            {losing && (
                <DealLossDialog
                    saving={loading}
                    onCancel={() => setLosing(false)}
                    onConfirm={async ({ lossReason, lossComment }) => {
                        const ok = await patch({
                            status: "CANCELLED",
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
