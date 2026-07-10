"use client"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { LuPlus, LuSearch } from "react-icons/lu"
import {
    PROJECT_STATUSES,
    PROJECT_STATUS_COLORS,
    PROJECT_STATUS_LABELS,
} from "@/lib/crm/project"
import { formatMoney } from "@/lib/crm/format"
import { Badge, Button, Field, Input, useToast } from "@/components/crm/ui"
import DealLossDialog from "./DealLossDialog"

function safeJson(text) {
    try {
        return JSON.parse(text)
    } catch {
        return null
    }
}

function fullName(u) {
    if (!u) return "—"
    return `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email
}

// Сдержанное оформление: нейтральные колонки, тонкая приглушённая
// акцентная полоска сверху для быстрой ориентации.
const COLUMN_ACCENT = {
    DRAFT: "bg-gray-300/70",
    APPROBATION: "bg-violet-300/70",
    IN_PROGRESS: "bg-blue-300/70",
    NO_NEED: "bg-amber-300/70",
}

export default function ProjectsKanban() {
    const toast = useToast()
    const [projects, setProjects] = useState(null)
    const [error, setError] = useState("")
    const [q, setQ] = useState("")
    const [draggingId, setDraggingId] = useState(null)
    const [dragOver, setDragOver] = useState(null)
    const [noNeedProject, setNoNeedProject] = useState(null)

    async function load() {
        setError("")
        try {
            const r = await fetch("/api/crm/projects")
            const text = await r.text()
            const data = text ? safeJson(text) : {}
            if (!r.ok) throw new Error(data?.error || `Ошибка ${r.status}`)
            setProjects(data.items || [])
        } catch (err) {
            setError(err.message)
            setProjects([])
        }
    }

    useEffect(() => {
        load()
    }, [])

    const filtered = useMemo(() => {
        if (!projects) return null
        if (!q.trim()) return projects
        const ql = q.toLowerCase()
        return projects.filter(p => {
            return (
                (p.internalName || "").toLowerCase().includes(ql) ||
                (p.endCustomer?.name || "").toLowerCase().includes(ql) ||
                (p.distributor?.name || "").toLowerCase().includes(ql)
            )
        })
    }, [projects, q])

    const byStatus = useMemo(() => {
        const map = Object.fromEntries(PROJECT_STATUSES.map(s => [s, []]))
        for (const p of filtered || []) {
            if (map[p.status]) map[p.status].push(p)
        }
        return map
    }, [filtered])

    async function moveProject(projectId, newStatus, extra = {}) {
        const prev = projects
        setProjects(curr =>
            curr.map(p => (p.id === projectId ? { ...p, status: newStatus } : p)),
        )
        try {
            const r = await fetch(`/api/crm/projects/${projectId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus, ...extra }),
            })
            if (!r.ok) {
                const text = await r.text()
                const d = text ? safeJson(text) : {}
                throw new Error(d?.error || "Не удалось сменить статус")
            }
        } catch (err) {
            setProjects(prev)
            toast.error(err.message)
        }
    }

    function onDragStart(id) {
        return e => {
            setDraggingId(id)
            e.dataTransfer.effectAllowed = "move"
            e.dataTransfer.setData("text/plain", id)
        }
    }

    function onDragEnd() {
        setDraggingId(null)
        setDragOver(null)
    }

    function onDragOver(status) {
        return e => {
            e.preventDefault()
            e.dataTransfer.dropEffect = "move"
            if (dragOver !== status) setDragOver(status)
        }
    }

    function onDrop(status) {
        return e => {
            e.preventDefault()
            const id = e.dataTransfer.getData("text/plain") || draggingId
            setDragOver(null)
            setDraggingId(null)
            if (!id) return
            const project = projects?.find(p => p.id === id)
            if (!project || project.status === status) return
            // «Проработано, нет потребности» — только с указанием причины.
            if (status === "NO_NEED") {
                setNoNeedProject(project)
                return
            }
            moveProject(id, status)
        }
    }

    return (
        <div className='space-y-4'>
            <div className='flex flex-wrap items-end gap-3'>
                <Field label='Поиск' className='flex-1 min-w-[240px]'>
                    <Input
                        icon={LuSearch}
                        value={q}
                        onChange={e => setQ(e.target.value)}
                        placeholder='Название, клиент'
                    />
                </Field>
                <Button href='/crm/projects/new'>
                    <LuPlus className='h-4 w-4' />
                    Новый проект
                </Button>
            </div>

            {error && <p className='text-sm text-red-600'>{error}</p>}

            <div className='flex gap-3 overflow-x-auto pb-3'>
                {PROJECT_STATUSES.map(status => {
                    const list = byStatus[status] || []
                    const sum = list.reduce((s, p) => s + Number(p.totalAmount || 0), 0)
                    return (
                        <div
                            key={status}
                            onDragOver={onDragOver(status)}
                            onDragLeave={() => setDragOver(null)}
                            onDrop={onDrop(status)}
                            className={`flex w-[290px] shrink-0 flex-col overflow-hidden rounded-2xl border bg-surface_muted transition-shadow ${
                                dragOver === status
                                    ? "border-brand_main ring-2 ring-brand_main/25"
                                    : "border-line"
                            }`}
                        >
                            <div className={`h-0.5 w-full ${COLUMN_ACCENT[status]}`} />
                            <div className='flex flex-1 flex-col p-3'>
                                <div className='mb-1 flex items-center justify-between'>
                                    <Badge className={PROJECT_STATUS_COLORS[status]}>
                                        {PROJECT_STATUS_LABELS[status]}
                                    </Badge>
                                    <span className='text-xs text-neutral-400'>{list.length}</span>
                                </div>
                                <p className='mb-3 text-xs text-neutral-500'>
                                    Итого: {formatMoney(sum)}
                                </p>
                                <div className='flex flex-col gap-2'>
                                    {projects === null && (
                                        <p className='text-xs text-neutral-400'>Загрузка...</p>
                                    )}
                                    {list.map(p => (
                                        <ProjectCard
                                            key={p.id}
                                            project={p}
                                            dragging={draggingId === p.id}
                                            onDragStart={onDragStart(p.id)}
                                            onDragEnd={onDragEnd}
                                        />
                                    ))}
                                    {projects !== null && list.length === 0 && (
                                        <p className='text-xs italic text-neutral-400'>Пусто</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            {noNeedProject && (
                <DealLossDialog
                    dealTitle={noNeedProject.internalName}
                    title='Почему у клиента нет потребности?'
                    confirmLabel='Проработано, нет потребности'
                    confirmClass='bg-amber-500 hover:bg-amber-600'
                    reasons={[]}
                    commentRequired
                    commentLabel='Причина'
                    commentPlaceholder='Например: закупились у другого поставщика на год вперёд'
                    onCancel={() => setNoNeedProject(null)}
                    onConfirm={({ lossComment }) => {
                        moveProject(noNeedProject.id, "NO_NEED", { lossComment })
                        setNoNeedProject(null)
                    }}
                />
            )}
        </div>
    )
}

function ProjectCard({ project, dragging, onDragStart, onDragEnd }) {
    return (
        <Link
            href={`/crm/projects/${project.id}`}
            draggable
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            className={`block cursor-grab rounded-xl border bg-white p-3 text-sm shadow-sm transition-all duration-200 hover:border-line_strong hover:shadow-md active:cursor-grabbing ${
                dragging ? "opacity-50" : "border-line"
            }`}
        >
            <p className='font-medium leading-snug text-neutral-900'>
                {project.internalName}
            </p>
            <p className='mt-1 truncate text-xs text-neutral-500'>
                {project.endCustomer?.name || "—"}
            </p>
            <div className='mt-2 flex items-center justify-between gap-2 text-xs'>
                <span className='truncate text-neutral-500'>{fullName(project.manager)}</span>
                <span className='shrink-0 font-semibold text-neutral-700'>
                    {formatMoney(project.totalAmount)}
                </span>
            </div>
        </Link>
    )
}
