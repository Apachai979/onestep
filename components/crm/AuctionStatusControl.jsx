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
            <select
                value={status}
                onChange={e => change(e.target.value)}
                disabled={loading}
                title='Сменить статус аукциона'
                className={`cursor-pointer appearance-none rounded-full border-0 bg-no-repeat px-3 py-1 pr-8 text-xs font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-primary_green/50 disabled:opacity-60 ${AUCTION_STATUS_COLORS[status] || ""}`}
                style={{
                    backgroundImage:
                        "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' fill='none' stroke='currentColor' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E\")",
                    backgroundPosition: "right 0.65rem center",
                    backgroundSize: "10px 6px",
                }}
            >
                {AUCTION_STATUSES.map(s => (
                    <option key={s} value={s} className='bg-white text-gray-900'>
                        {AUCTION_STATUS_LABELS[s]}
                    </option>
                ))}
            </select>

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
