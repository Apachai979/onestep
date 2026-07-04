"use client"
import { useState } from "react"
import ProjectsKanban from "./ProjectsKanban"
import ProjectsList from "./ProjectsList"

export default function ProjectsTabs() {
    const [view, setView] = useState("kanban")

    return (
        <div className='space-y-4'>
            <div className='flex gap-1 self-start rounded-lg border border-brand_soft/40 bg-white p-1 w-fit'>
                {[
                    ["kanban", "Канбан"],
                    ["list", "Список"],
                ].map(([v, label]) => (
                    <button
                        key={v}
                        type='button'
                        onClick={() => setView(v)}
                        className={`rounded-md px-3 py-1.5 text-sm ${
                            view === v
                                ? "bg-brand_main text-white"
                                : "text-gray-700 hover:bg-brand_soft/30"
                        }`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {view === "kanban" ? <ProjectsKanban /> : <ProjectsList />}
        </div>
    )
}
