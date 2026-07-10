"use client"
import { useState } from "react"
import ProjectsKanban from "./ProjectsKanban"
import ProjectsList from "./ProjectsList"

export default function ProjectsTabs() {
    const [view, setView] = useState("kanban")

    return (
        <div className='space-y-4'>
            <div className='inline-flex w-fit self-start rounded-xl border border-line bg-white p-1 text-sm shadow-sm'>
                {[
                    ["kanban", "Канбан"],
                    ["list", "Список"],
                ].map(([v, label]) => (
                    <button
                        key={v}
                        type='button'
                        onClick={() => setView(v)}
                        className={`rounded-lg px-4 py-1.5 font-medium transition-all duration-200 ${
                            view === v
                                ? "bg-neutral-900 text-white shadow-sm"
                                : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
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
