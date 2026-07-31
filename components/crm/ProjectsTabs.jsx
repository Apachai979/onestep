"use client"
import { useState } from "react"
import { LuPlus } from "react-icons/lu"
import { Button } from "@/components/crm/ui"
import ProjectsKanban from "./ProjectsKanban"
import ProjectsList from "./ProjectsList"

export default function ProjectsTabs({ isAdmin = false }) {
    const [view, setView] = useState("kanban")

    return (
        <div className='space-y-4'>
            {/* Кнопка создания живёт на уровне вкладок — она нужна в обоих режимах. */}
            <div className='flex flex-wrap items-center justify-between gap-3'>
                <div className='inline-flex w-fit rounded-xl border border-line bg-white p-1 text-sm shadow-sm'>
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
                <Button href='/crm/projects/new' size='sm'>
                    <LuPlus className='h-4 w-4' />
                    Новый проект
                </Button>
            </div>

            {view === "kanban" ? <ProjectsKanban isAdmin={isAdmin} /> : <ProjectsList />}
        </div>
    )
}
