"use client"
import { useState } from "react"
import TaskList from "./TaskList"
import TaskCalendar from "./TaskCalendar"
import TaskForm from "./TaskForm"
import { Button, Modal } from "@/components/crm/ui"

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
                <div className='inline-flex rounded-xl border border-line bg-white p-1 text-sm shadow-sm'>
                    {[
                        { key: "list", label: "Список" },
                        { key: "calendar", label: "Календарь" },
                    ].map(t => (
                        <button
                            key={t.key}
                            type='button'
                            onClick={() => setView(t.key)}
                            className={`rounded-lg px-4 py-1.5 font-medium transition-all duration-200 ${
                                view === t.key
                                    ? "bg-neutral-900 text-white shadow-sm"
                                    : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
                            }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
                <Button type='button' onClick={() => openCreate(null)}>
                    Новая задача
                </Button>
            </div>

            <Modal
                open={creating}
                onClose={closeCreate}
                title='Новая задача'
                size='2xl'
            >
                <TaskForm
                    currentUserId={currentUserId}
                    defaultStart={defaultStart}
                    onCancel={closeCreate}
                    onSaved={closeCreate}
                />
            </Modal>

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
