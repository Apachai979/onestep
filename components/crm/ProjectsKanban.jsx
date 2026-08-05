"use client"
import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
    PROJECT_KANBAN_PER_STATUS,
    PROJECT_STATUSES,
    PROJECT_STATUS_COLORS,
    PROJECT_STATUS_LABELS,
    openDealsListText,
} from "@/lib/crm/project"
import { formatMoney } from "@/lib/crm/format"
import { Badge, useToast } from "@/components/crm/ui"
import { PROJECT_LOCKED_STATUSES } from "@/lib/crm/access"
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

const EMPTY_COLUMN = { items: [], total: 0, sum: 0 }

function findProject(columns, projectId) {
    for (const status of PROJECT_STATUSES) {
        const project = columns?.[status]?.items.find(p => p.id === projectId)
        if (project) return project
    }
    return null
}

// Оптимистичный перенос: карточка сразу переезжает в другую колонку, счётчик и
// сумма обеих колонок пересчитываются на месте. Точные значения (и следующая
// карточка вместо ушедшей, если колонка обрезана лимитом) придут ответом GET.
function moveCard(columns, projectId, newStatus) {
    if (!columns) return columns
    const from = PROJECT_STATUSES.find(s =>
        (columns[s]?.items || []).some(p => p.id === projectId),
    )
    const target = columns[newStatus]
    if (!from || from === newStatus || !target) return columns

    const project = columns[from].items.find(p => p.id === projectId)
    const amount = Number(project.totalAmount || 0)
    return {
        ...columns,
        [from]: {
            ...columns[from],
            items: columns[from].items.filter(p => p.id !== projectId),
            total: Math.max(0, columns[from].total - 1),
            sum: columns[from].sum - amount,
        },
        [newStatus]: {
            ...target,
            items: [{ ...project, status: newStatus }, ...target.items],
            total: target.total + 1,
            sum: target.sum + amount,
        },
    }
}

// Фильтры общие для канбана и списка — они живут в ProjectsTabs и приходят
// сюда готовой строкой запроса (без статуса: здесь статусы — это колонки).
export default function ProjectsKanban({ query = "", isAdmin = false, onShowAll }) {
    const toast = useToast()
    const [columns, setColumns] = useState(null)
    const [error, setError] = useState("")
    const [draggingId, setDraggingId] = useState(null)
    const [dragOver, setDragOver] = useState(null)
    const [noNeedProject, setNoNeedProject] = useState(null)

    // Доска грузит по PROJECT_KANBAN_PER_STATUS карточек на колонку; полное
    // количество и сумма приходят отдельными числами в каждой колонке.
    const url = useMemo(() => {
        const params = new URLSearchParams(query)
        params.set("view", "kanban")
        params.set("perStatus", String(PROJECT_KANBAN_PER_STATUS))
        return `/api/crm/projects?${params}`
    }, [query])

    const fetchColumns = useCallback(
        async signal => {
            const r = await fetch(url, { signal })
            const text = await r.text()
            const data = text ? safeJson(text) : {}
            if (!r.ok) throw new Error(data?.error || `Ошибка ${r.status}`)
            return data.columns || {}
        },
        [url],
    )

    useEffect(() => {
        const controller = new AbortController()
        setError("")
        fetchColumns(controller.signal)
            .then(setColumns)
            .catch(err => {
                if (err.name === "AbortError") return
                setError(err.message)
                setColumns({})
            })
        return () => controller.abort()
    }, [fetchColumns])

    // Менеджер не возвращает проект из «Проработано, нет потребности».
    function isLocked(status) {
        return !isAdmin && PROJECT_LOCKED_STATUSES.includes(status)
    }

    async function moveProject(projectId, newStatus, extra = {}) {
        const prev = columns
        setColumns(curr => moveCard(curr, projectId, newStatus))
        try {
            const r = await fetch(`/api/crm/projects/${projectId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus, ...extra }),
            })
            if (!r.ok) {
                const text = await r.text()
                const d = text ? safeJson(text) : {}
                const err = new Error(d?.error || "Не удалось сменить статус")
                // Незакрытые сделки, из-за которых проект нельзя закрыть, —
                // показываем списком под текстом ошибки.
                err.openDeals = d?.openDeals
                throw err
            }
            // Перечитываем: колонка могла быть обрезана лимитом, и на месте
            // ушедшей карточки должна появиться следующая.
            fetchColumns()
                .then(setColumns)
                .catch(() => {})
        } catch (err) {
            setColumns(prev)
            if (err.openDeals?.length) {
                toast.error(openDealsListText(err.openDeals), {
                    title: err.message,
                    duration: 12000,
                })
            } else {
                toast.error(err.message)
            }
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
            const project = findProject(columns, id)
            if (!project || project.status === status) return
            // Проработанный проект менеджер не двигает — карточка заморожена.
            if (isLocked(project.status)) return
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
            {error && <p className='text-sm text-red-600'>{error}</p>}

            <div className='flex gap-3 overflow-x-auto pb-3'>
                {PROJECT_STATUSES.map(status => {
                    const column = columns?.[status] || EMPTY_COLUMN
                    const list = column.items
                    // Колонка длиннее лимита: показываем «сколько из скольких»,
                    // чтобы счётчик не врал про объём.
                    const truncated = column.total > list.length
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
                                    <span
                                        className='text-xs text-neutral-400'
                                        title={
                                            truncated
                                                ? `Показаны ${list.length} из ${column.total} — остальные в списке`
                                                : undefined
                                        }
                                    >
                                        {truncated
                                            ? `${list.length} из ${column.total}`
                                            : column.total}
                                    </span>
                                </div>
                                {/* Итог считается по всей колонке, а не по загруженным карточкам. */}
                                <p className='mb-3 text-xs text-neutral-500'>
                                    Итого: {formatMoney(column.sum)}
                                </p>
                                <div className='flex flex-col gap-2'>
                                    {columns === null && (
                                        <p className='text-xs text-neutral-400'>Загрузка...</p>
                                    )}
                                    {list.map(p => (
                                        <ProjectCard
                                            key={p.id}
                                            project={p}
                                            locked={isLocked(p.status)}
                                            dragging={draggingId === p.id}
                                            onDragStart={onDragStart(p.id)}
                                            onDragEnd={onDragEnd}
                                        />
                                    ))}
                                    {columns !== null && list.length === 0 && (
                                        <p className='text-xs italic text-neutral-400'>Пусто</p>
                                    )}
                                    {truncated && (
                                        <button
                                            type='button'
                                            onClick={() => onShowAll?.(status)}
                                            className='rounded-xl border border-dashed border-line py-2 text-xs font-medium text-neutral-500 transition-colors hover:border-brand_main/40 hover:text-brand_main'
                                        >
                                            Показать все ({column.total}) →
                                        </button>
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

function ProjectCard({ project, locked, dragging, onDragStart, onDragEnd }) {
    return (
        <Link
            href={`/crm/projects/${project.id}`}
            draggable={!locked}
            onDragStart={locked ? undefined : onDragStart}
            onDragEnd={locked ? undefined : onDragEnd}
            className={`block cursor-pointer rounded-xl border bg-white p-3 text-sm shadow-sm transition-all duration-200 hover:border-line_strong hover:shadow-md ${
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
