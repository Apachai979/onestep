"use client"
import { useEffect, useMemo, useRef, useState } from "react"
import {
    LuArrowDown,
    LuArrowUp,
    LuChevronLeft,
    LuChevronRight,
    LuChevronsUpDown,
    LuSettings2,
    LuX,
} from "react-icons/lu"
import TableSkeleton from "./TableSkeleton"

/**
 * Переиспользуемая таблица дизайн-системы CRM.
 *
 * columns: [{
 *   key, header, render(row)=>node, sortValue(row)=>comparable,
 *   align: "left"|"right"|"center", sortable, hideable, defaultHidden,
 *   headerClassName, cellClassName
 * }]
 *
 * Возможности: sticky-header, hover, сортировка, поиск, фильтры (toolbar-slot),
 * пагинация, выбор строк + bulk actions, переключение видимости колонок.
 * (Column-resize / saved-views / виртуализация — следующий проход.)
 */
export default function DataTable({
    columns,
    rows,
    getRowId = r => r.id,
    onRowClick,
    rowClassName,
    loading = false,
    empty = null,
    selectable = false,
    bulkActions,
    toolbar,
    searchable = false,
    searchPlaceholder = "Поиск...",
    searchAccessor,
    pageSize = 25,
    initialSort = null,
    footer,
    className = "",
}) {
    const [sort, setSort] = useState(initialSort)
    const [page, setPage] = useState(0)
    const [selected, setSelected] = useState(() => new Set())
    const [hidden, setHidden] = useState(
        () => new Set(columns.filter(c => c.defaultHidden).map(c => c.key)),
    )
    const [query, setQuery] = useState("")
    const [colMenu, setColMenu] = useState(false)
    const colMenuRef = useRef(null)

    const visibleColumns = columns.filter(c => !hidden.has(c.key))
    const colSpan = visibleColumns.length + (selectable ? 1 : 0)

    useEffect(() => {
        setPage(0)
    }, [query, sort, rows])

    useEffect(() => {
        if (!colMenu) return
        function onDoc(e) {
            if (colMenuRef.current && !colMenuRef.current.contains(e.target)) setColMenu(false)
        }
        document.addEventListener("mousedown", onDoc)
        return () => document.removeEventListener("mousedown", onDoc)
    }, [colMenu])

    const filtered = useMemo(() => {
        if (!searchable || !query.trim()) return rows
        const q = query.trim().toLowerCase()
        return rows.filter(r => {
            const hay = searchAccessor
                ? searchAccessor(r)
                : columns.map(c => (c.sortValue ? c.sortValue(r) : "")).join(" ")
            return String(hay).toLowerCase().includes(q)
        })
    }, [rows, query, searchable, searchAccessor, columns])

    const sorted = useMemo(() => {
        if (!sort) return filtered
        const col = columns.find(c => c.key === sort.key)
        if (!col) return filtered
        const val = col.sortValue || (r => r[sort.key])
        const arr = [...filtered].sort((a, b) => {
            const av = val(a)
            const bv = val(b)
            if (av == null && bv == null) return 0
            if (av == null) return 1
            if (bv == null) return -1
            if (typeof av === "number" && typeof bv === "number") return av - bv
            return String(av).localeCompare(String(bv), "ru")
        })
        if (sort.dir === "desc") arr.reverse()
        return arr
    }, [filtered, sort, columns])

    const total = sorted.length
    const pageCount = Math.max(1, Math.ceil(total / pageSize))
    const clampedPage = Math.min(page, pageCount - 1)
    const pageRows = useMemo(
        () => sorted.slice(clampedPage * pageSize, clampedPage * pageSize + pageSize),
        [sorted, clampedPage, pageSize],
    )

    const pageIds = pageRows.map(getRowId)
    const allOnPageSelected =
        pageIds.length > 0 && pageIds.every(id => selected.has(id))

    function toggleSort(col) {
        if (!col.sortable) return
        setSort(prev => {
            if (!prev || prev.key !== col.key) return { key: col.key, dir: "asc" }
            if (prev.dir === "asc") return { key: col.key, dir: "desc" }
            return null
        })
    }

    function toggleRow(id) {
        setSelected(prev => {
            const next = new Set(prev)
            next.has(id) ? next.delete(id) : next.add(id)
            return next
        })
    }

    function togglePage() {
        setSelected(prev => {
            const next = new Set(prev)
            if (allOnPageSelected) pageIds.forEach(id => next.delete(id))
            else pageIds.forEach(id => next.add(id))
            return next
        })
    }

    const clearSelection = () => setSelected(new Set())
    const selectedIds = Array.from(selected)

    const alignCls = a =>
        a === "right" ? "text-right" : a === "center" ? "text-center" : "text-left"

    return (
        <div className={`space-y-3 ${className}`}>
            {/* Toolbar */}
            {(searchable || toolbar || columns.some(c => c.hideable)) && (
                <div className='flex flex-wrap items-center gap-2'>
                    {searchable && (
                        <div className='relative min-w-[200px] flex-1 sm:max-w-xs'>
                            <input
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                placeholder={searchPlaceholder}
                                className='h-9 w-full rounded-xl border border-line bg-white px-3 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-brand_main focus:outline-none focus:ring-2 focus:ring-brand_main/20'
                            />
                        </div>
                    )}
                    {toolbar}
                    {columns.some(c => c.hideable) && (
                        <div ref={colMenuRef} className='relative ml-auto'>
                            <button
                                type='button'
                                onClick={() => setColMenu(o => !o)}
                                className='inline-flex h-9 items-center gap-1.5 rounded-xl border border-line bg-white px-3 text-sm text-neutral-600 shadow-sm transition-colors hover:bg-surface_muted'
                                aria-label='Колонки'
                            >
                                <LuSettings2 className='h-4 w-4' />
                                <span className='hidden sm:inline'>Колонки</span>
                            </button>
                            {colMenu && (
                                <div className='absolute right-0 top-full z-40 mt-1.5 w-56 rounded-xl border border-line bg-white p-1.5 shadow-lg shadow-neutral-900/10 animate-emersion'>
                                    <p className='px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-400'>
                                        Показать колонки
                                    </p>
                                    {columns
                                        .filter(c => c.hideable)
                                        .map(c => (
                                            <label
                                                key={c.key}
                                                className='flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50'
                                            >
                                                <input
                                                    type='checkbox'
                                                    checked={!hidden.has(c.key)}
                                                    onChange={() =>
                                                        setHidden(prev => {
                                                            const next = new Set(prev)
                                                            next.has(c.key)
                                                                ? next.delete(c.key)
                                                                : next.add(c.key)
                                                            return next
                                                        })
                                                    }
                                                    className='h-4 w-4 rounded border-line text-brand_main focus:ring-brand_main/30'
                                                />
                                                {c.header}
                                            </label>
                                        ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Bulk actions bar */}
            {selectable && selected.size > 0 && (
                <div className='flex flex-wrap items-center gap-3 rounded-xl border border-brand_main/30 bg-brand_main/5 px-3 py-2'>
                    <span className='text-sm font-medium text-neutral-700'>
                        Выбрано: {selected.size}
                    </span>
                    <div className='flex flex-wrap items-center gap-2'>
                        {bulkActions?.(selectedIds, clearSelection)}
                    </div>
                    <button
                        type='button'
                        onClick={clearSelection}
                        className='ml-auto inline-flex h-7 items-center gap-1 rounded-lg px-2 text-xs text-neutral-500 hover:bg-white hover:text-neutral-700'
                    >
                        <LuX className='h-3.5 w-3.5' />
                        Сбросить
                    </button>
                </div>
            )}

            {/* Table */}
            <div className='overflow-x-auto rounded-2xl border border-line bg-white shadow-sm'>
                <table className='w-full text-sm'>
                    <thead className='sticky top-0 z-10 bg-surface_muted text-left text-xs font-medium uppercase tracking-wide text-neutral-500'>
                        <tr>
                            {selectable && (
                                <th className='w-10 px-4 py-3'>
                                    <input
                                        type='checkbox'
                                        checked={allOnPageSelected}
                                        onChange={togglePage}
                                        aria-label='Выбрать все на странице'
                                        className='h-4 w-4 rounded border-line text-brand_main focus:ring-brand_main/30'
                                    />
                                </th>
                            )}
                            {visibleColumns.map(col => {
                                const activeSort = sort?.key === col.key
                                return (
                                    <th
                                        key={col.key}
                                        aria-sort={
                                            activeSort
                                                ? sort.dir === "asc"
                                                    ? "ascending"
                                                    : "descending"
                                                : undefined
                                        }
                                        className={`px-4 py-3 font-medium ${alignCls(col.align)} ${col.headerClassName || ""}`}
                                    >
                                        {col.sortable ? (
                                            <button
                                                type='button'
                                                onClick={() => toggleSort(col)}
                                                className={`inline-flex items-center gap-1 transition-colors hover:text-neutral-800 ${col.align === "right" ? "flex-row-reverse" : ""}`}
                                            >
                                                {col.header}
                                                {activeSort ? (
                                                    sort.dir === "asc" ? (
                                                        <LuArrowUp className='h-3.5 w-3.5 text-brand_main' />
                                                    ) : (
                                                        <LuArrowDown className='h-3.5 w-3.5 text-brand_main' />
                                                    )
                                                ) : (
                                                    <LuChevronsUpDown className='h-3.5 w-3.5 text-neutral-300' />
                                                )}
                                            </button>
                                        ) : (
                                            col.header
                                        )}
                                    </th>
                                )
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {loading && <TableSkeleton rows={6} cols={colSpan} />}
                        {!loading && total === 0 && (
                            <tr>
                                <td colSpan={colSpan} className='px-4 py-4'>
                                    {empty}
                                </td>
                            </tr>
                        )}
                        {!loading &&
                            pageRows.map(row => {
                                const id = getRowId(row)
                                const isSelected = selected.has(id)
                                return (
                                    <tr
                                        key={id}
                                        onClick={onRowClick ? () => onRowClick(row) : undefined}
                                        className={`border-t border-line transition-colors ${onRowClick ? "cursor-pointer" : ""} ${isSelected ? "bg-brand_main/5" : "hover:bg-surface_muted"} ${rowClassName ? rowClassName(row) : ""}`}
                                    >
                                        {selectable && (
                                            <td
                                                className='w-10 px-4 py-3.5'
                                                onClick={e => e.stopPropagation()}
                                            >
                                                <input
                                                    type='checkbox'
                                                    checked={isSelected}
                                                    onChange={() => toggleRow(id)}
                                                    aria-label='Выбрать строку'
                                                    className='h-4 w-4 rounded border-line text-brand_main focus:ring-brand_main/30'
                                                />
                                            </td>
                                        )}
                                        {visibleColumns.map(col => (
                                            <td
                                                key={col.key}
                                                className={`px-4 py-3.5 text-neutral-700 ${alignCls(col.align)} ${col.cellClassName || ""}`}
                                            >
                                                {col.render ? col.render(row) : row[col.key]}
                                            </td>
                                        ))}
                                    </tr>
                                )
                            })}
                    </tbody>
                    {footer && !loading && total > 0 && (
                        <tfoot className='bg-surface_muted'>{footer}</tfoot>
                    )}
                </table>
            </div>

            {/* Pagination */}
            {!loading && total > pageSize && (
                <div className='flex items-center justify-between gap-3 px-1 text-xs text-neutral-500'>
                    <span>
                        {clampedPage * pageSize + 1}–
                        {Math.min((clampedPage + 1) * pageSize, total)} из {total}
                    </span>
                    <div className='flex items-center gap-1'>
                        <button
                            type='button'
                            onClick={() => setPage(p => Math.max(0, p - 1))}
                            disabled={clampedPage === 0}
                            className='inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-white text-neutral-600 transition-colors hover:bg-surface_muted disabled:opacity-40 disabled:pointer-events-none'
                            aria-label='Назад'
                        >
                            <LuChevronLeft className='h-4 w-4' />
                        </button>
                        <span className='px-2 tabular-nums'>
                            {clampedPage + 1} / {pageCount}
                        </span>
                        <button
                            type='button'
                            onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))}
                            disabled={clampedPage >= pageCount - 1}
                            className='inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-white text-neutral-600 transition-colors hover:bg-surface_muted disabled:opacity-40 disabled:pointer-events-none'
                            aria-label='Вперёд'
                        >
                            <LuChevronRight className='h-4 w-4' />
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
