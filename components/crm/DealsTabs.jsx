"use client"
import { useState } from "react"
import DealsKanban from "./DealsKanban"
import DealsList from "./DealsList"

const TABS = [
    { key: "kanban", label: "Канбан" },
    { key: "list", label: "Список" },
]

export default function DealsTabs({ currentUserId }) {
    const [tab, setTab] = useState("kanban")

    return (
        <div className='space-y-4'>
            <div className='inline-flex rounded-lg border border-brand_soft/40 bg-white p-0.5 text-sm'>
                {TABS.map(t => (
                    <button
                        key={t.key}
                        type='button'
                        onClick={() => setTab(t.key)}
                        className={`rounded-md px-4 py-1.5 transition ${
                            tab === t.key
                                ? "bg-brand_main text-white shadow-sm"
                                : "text-gray-700 hover:bg-brand_soft/30"
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>
            {tab === "kanban" ? (
                <DealsKanban />
            ) : (
                <DealsList currentUserId={currentUserId} />
            )}
        </div>
    )
}
