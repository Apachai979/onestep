"use client"
import { useState } from "react"
import TaskList from "./TaskList"
import TaskCalendar from "./TaskCalendar"
import TaskForm from "./TaskForm"

export default function TasksTabs({ currentUserId, currentUserRole }) {
    const [view, setView] = useState("list")
    const [creating, setCreating] = useState(false)
    const [defaultStart, setDefaultStart] = useState(null)

    function openCreate(start) {
        setDefaultStart(start || null)
        setCreating(true)
    }

    function closeCreate() {
        setCreating(false)
        setDefaultStart(null)
    }

    return (
        <div className='space-y-4'>
            <div className='flex flex-wrap items-center justify-between gap-3'>
                <div className='flex gap-1 rounded-lg border border-brand_soft/40 bg-white p-1'>
                    <button
                        type='button'
                        onClick={() => setView("list")}
                        className={`rounded-md px-3 py-1.5 text-sm ${
                            view === "list"
                                ? "bg-brand_main text-white"
                                : "text-gray-700 hover:bg-brand_soft/30"
                        }`}
                    >
                        Список
                    </button>
                    <button
                        type='button'
                        onClick={() => setView("calendar")}
                        className={`rounded-md px-3 py-1.5 text-sm ${
                            view === "calendar"
                                ? "bg-brand_main text-white"
                                : "text-gray-700 hover:bg-brand_soft/30"
                        }`}
                    >
                        Календарь
                    </button>
                </div>
                <button
                    type='button'
                    onClick={() => openCreate(null)}
                    className='rounded-lg bg-brand_main px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand_main/90'
                >
                    Новая задача
                </button>
            </div>

            {creating && (
                <div
                    className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4'
                    onClick={closeCreate}
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        className='max-h-[90vh] w-full max-w-3xl overflow-auto rounded-xl bg-white p-5 shadow-2xl'
                    >
                        <h2 className='mb-4 text-lg font-semibold text-night_green'>
                            Новая задача
                        </h2>
                        <TaskForm
                            currentUserId={currentUserId}
                            defaultStart={defaultStart}
                            onCancel={closeCreate}
                            onSaved={closeCreate}
                        />
                    </div>
                </div>
            )}

            {view === "list" ? (
                <TaskList
                    currentUserId={currentUserId}
                    currentUserRole={currentUserRole}
                />
            ) : (
                <TaskCalendar
                    currentUserId={currentUserId}
                    currentUserRole={currentUserRole}
                    onCreateAt={openCreate}
                />
            )}
        </div>
    )
}
