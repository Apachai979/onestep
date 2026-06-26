"use client"
import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { onTasksChanged } from "@/lib/crm/tasks-events"

function safeJson(text) {
    try {
        return JSON.parse(text)
    } catch {
        return null
    }
}

export default function TasksNavLink() {
    const [counts, setCounts] = useState(null)

    const load = useCallback(async () => {
        try {
            const r = await fetch("/api/crm/tasks/count")
            const text = await r.text()
            const data = text ? safeJson(text) : {}
            if (r.ok) setCounts(data)
        } catch {
            /* ignore */
        }
    }, [])

    useEffect(() => {
        load()
        const id = setInterval(load, 60_000)
        const off = onTasksChanged(load)
        return () => {
            clearInterval(id)
            off()
        }
    }, [load])

    const overdue = counts?.mineOverdue || 0
    const open = counts?.mineOpen || 0
    const showBadge = open > 0
    const badgeClass = overdue > 0 ? "bg-red-500 text-white" : "bg-brand_main text-white"

    return (
        <Link
            href='/crm/tasks'
            className='relative inline-flex items-center gap-2 text-gray-600 hover:text-brand_main'
        >
            Задачи
            {showBadge && (
                <span
                    title={
                        overdue > 0
                            ? `${overdue} просроченных, всего ${open} открытых`
                            : `${open} открытых задач`
                    }
                    className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-semibold ${badgeClass}`}
                >
                    {open}
                </span>
            )}
        </Link>
    )
}
