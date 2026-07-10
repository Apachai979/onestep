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
            <div className='inline-flex rounded-xl border border-line bg-white p-1 text-sm shadow-sm'>
                {TABS.map(t => (
                    <button
                        key={t.key}
                        type='button'
                        onClick={() => setTab(t.key)}
                        className={`rounded-lg px-4 py-1.5 font-medium transition-all duration-200 ${
                            tab === t.key
                                ? "bg-neutral-900 text-white shadow-sm"
                                : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
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
