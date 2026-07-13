"use client"
import { useRouter } from "next/navigation"
import { useState } from "react"
import {
    AUCTION_STATUSES,
    AUCTION_STATUS_COLORS,
    AUCTION_STATUS_LABELS,
} from "@/lib/crm/auction"
import { useToast } from "@/components/crm/ui"
import DealLossDialog from "./DealLossDialog"
import StatusSelect from "./StatusSelect"

export default function AuctionStatusControl({ auctionId, currentStatus }) {
    const router = useRouter()
    const toast = useToast()
    const [status, setStatus] = useState(currentStatus)
    const [loading, setLoading] = useState(false)
    const [askReason, setAskReason] = useState(false)

    async function patch(next, extra = {}) {
        setLoading(true)
        const res = await fetch(`/api/crm/auctions/${auctionId}`, {
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
        // «Проиграли» — только с указанием причины.
        if (next === "LOST") {
            setAskReason(true)
            return
        }
        patch(next)
    }

    return (
        <>
            <StatusSelect
                value={status}
                options={AUCTION_STATUSES}
                labels={AUCTION_STATUS_LABELS}
                colors={AUCTION_STATUS_COLORS}
                disabled={loading}
                title='Сменить статус аукциона'
                onChange={change}
            />

            {askReason && (
                <DealLossDialog
                    title='Почему проиграли аукцион?'
                    confirmLabel='Аукцион проигран'
                    reasons={[]}
                    commentRequired
                    commentLabel='Причина проигрыша'
                    commentPlaceholder='Например: конкурент опустил цену ниже нашей минимальной'
                    saving={loading}
                    onCancel={() => setAskReason(false)}
                    onConfirm={({ lossComment }) => patch("LOST", { lossComment })}
                />
            )}
        </>
    )
}
