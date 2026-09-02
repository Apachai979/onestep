"use client"
import { Fragment, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
    LuArrowDown,
    LuArrowUp,
    LuChevronDown,
    LuChevronLeft,
    LuChevronRight,
    LuChevronsUpDown,
    LuSettings2,
    LuX,
} from "react-icons/lu"
import TableSkeleton from "./TableSkeleton"

// Смена страницы возвращает к началу таблицы, поэтому отступ сверху: на узких
// экранах шапка CRM прилипшая, и без него первая строка уезжала бы под неё.
const PAGE_SCROLL_OFFSET = 72

/**
 * Переиспользуемая таблица дизайн-системы CRM.
 *
 * columns: [{
 *   key, header, render(row)=>node, sortValue(row)=>comparable,
 *   align: "left"|"right"|"center", sortable, hideable, defaultHidden,
 *   headerClassName, cellClassName
 * }]
 *
 * expandable: {
 *   render(row) => node,      // содержимое раскрытой строки
 *   isExpandable(row) => bool // необязательно: строки без деталей не раскрываются
 * }
 * Раскрытие живёт под строкой во всю ширину таблицы — так деталь читается в
 * контексте своей строки, без модалки и потери места на странице.
 *
 * rowHref(row) => "/crm/deals/1" — строка ведёт на карточку и ведёт себя как
 * ссылка: обычный клик переходит в этом же окне, Ctrl/Cmd/Shift-клик и средняя
 * кнопка открывают новую вкладку (в установленном приложении — вкладку
 * приложения). Для строк без адреса остаётся onRowClick.
 *
 * Возможности: sticky-header, hover, сортировка, поиск, фильтры (toolbar-slot),
 * пагинация, выбор строк + bulk actions, переключение видимости колонок,
 * раскрытие строк. (Column-resize / saved-views / виртуализация — следующий проход.)
 */
// Клик по ссылке, кнопке или полю внутри ячейки строка не перехватывает:
// иначе переход шёл бы дважды — и по вложенной ссылке, и по строке.
function fromInteractive(e) {
    return Boolean(e.target.closest?.("a,button,input,label,select,textarea"))
}

function opensNewTab(e) {
    return e.metaKey || e.ctrlKey || e.shiftKey
}

export default function DataTable({
    columns,
    rows,
    getRowId = r => r.id,
    rowHref,
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
    expandable = null,
    footer,
    className = "",
}) {
    const router = useRouter()
    const [sort, setSort] = useState(initialSort)
    const [page, setPage] = useState(0)
    const [selected, setSelected] = useState(() => new Set())
    const [hidden, setHidden] = useState(
        () => new Set(columns.filter(c => c.defaultHidden).map(c => c.key))
    )
    const [query, setQuery] = useState("")
    const [colMenu, setColMenu] = useState(false)
    const [expanded, setExpanded] = useState(() => new Set())
    const colMenuRef = useRef(null)
    const rootRef = useRef(null)

    const visibleColumns = columns.filter(c => !hidden.has(c.key))
    const colSpan = visibleColumns.length + (selectable ? 1 : 0) + (expandable ? 1 : 0)

    useEffect(() => {
        setPage(0)
    }, [query, sort, rows])

    // Колонки могут появиться уже после первого рендера (например, склады из
    // загруженных данных) — их defaultHidden начальным useState не поймать.
    // Прячем только впервые увиденные ключи, иначе снятая пользователем галка
    // возвращалась бы на место при каждом обновлении данных.
    const knownColumnKeys = useRef(new Set(columns.map(c => c.key)))
    useEffect(() => {
        const fresh = columns.filter(c => c.defaultHidden && !knownColumnKeys.current.has(c.key))
        columns.forEach(c => knownColumnKeys.current.add(c.key))
        if (fresh.length > 0) {
            setHidden(prev => new Set([...prev, ...fresh.map(c => c.key)]))
        }
    }, [columns])

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
        [sorted, clampedPage, pageSize]
    )

    const pageIds = pageRows.map(getRowId)
    const allOnPageSelected = pageIds.length > 0 && pageIds.every(id => selected.has(id))

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

    function canExpand(row) {
        if (!expandable) return false
        return expandable.isExpandable ? expandable.isExpandable(row) : true
    }

    function toggleExpanded(id) {
        setExpanded(prev => {
            const next = new Set(prev)
            next.has(id) ? next.delete(id) : next.add(id)
            return next
        })
    }

    // Страницы переключаются и снизу, и сверху таблицы: нажали внизу — читать
    // начинают опять с первой строки, а она осталась выше экрана. Скроллим
    // только вверх (страница ниже начала таблицы) — иначе список, целиком
    // помещающийся на экране, дёргался бы на каждом нажатии.
    function goToPage(next) {
        setPage(next)
        const el = rootRef.current
        if (!el || typeof window === "undefined") return
        const top = el.getBoundingClientRect().top + window.scrollY - PAGE_SCROLL_OFFSET
        if (window.scrollY > top) window.scrollTo({ top, behavior: "smooth" })
    }

    const alignCls = a =>
        a === "right" ? "text-right" : a === "center" ? "text-center" : "text-left"

    const showPagination = !loading && total > pageSize

    // Выбор колонок живёт в строке пагинации, слева от стрелок: своей строкой
    // он занимал место над таблицей ради одной кнопки. Пагинации нет — кнопка
    // возвращается в тулбар (там же, где поиск).
    const columnsControl = columns.some(c => c.hideable) ? (
        <div ref={colMenuRef} className='relative'>
            <button
                type='button'
                onClick={() => setColMenu(o => !o)}
                className={`inline-flex h-8 items-center gap-1 rounded-lg border px-2 text-xs transition-colors ${
                    colMenu
                        ? "border-neutral-300 bg-surface_muted text-neutral-900"
                        : "border-line bg-white text-neutral-500 hover:border-neutral-300 hover:text-neutral-900"
                }`}
                aria-label='Колонки'
            >
                <LuSettings2 className='h-3.5 w-3.5' />
                <span className='hidden sm:inline'>Колонки</span>
            </button>
            {colMenu && (
                <div className='absolute right-0 top-full z-40 mt-1.5 w-56 animate-emersion rounded-xl border border-line bg-white p-1.5 shadow-lg shadow-neutral-900/10'>
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
                                            next.has(c.key) ? next.delete(c.key) : next.add(c.key)
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
    ) : null

    // Одна и та же панель рисуется над таблицей и под ней: на длинной странице
    // кнопка «вперёд» только внизу заставляет прокручивать весь список. Кнопка
    // колонок — только в верхней: colMenuRef и открытое меню в единственном
    // экземпляре.
    function renderPagination(withColumns = false) {
        if (!showPagination) return null
        return (
            <div className='flex items-center justify-between gap-3 px-1 text-xs text-neutral-500'>
                <span>
                    {clampedPage * pageSize + 1}–{Math.min((clampedPage + 1) * pageSize, total)} из{" "}
                    {total}
                </span>
                <div className='flex items-center gap-3'>
                    {withColumns ? columnsControl : null}
                    <div className='flex items-center gap-1'>
                        <button
                            type='button'
                            onClick={() => goToPage(Math.max(0, clampedPage - 1))}
                            disabled={clampedPage === 0}
                            className='inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-white text-neutral-600 transition-colors hover:bg-surface_muted disabled:pointer-events-none disabled:opacity-40'
                            aria-label='Назад'
                        >
                            <LuChevronLeft className='h-4 w-4' />
                        </button>
                        <span className='px-2 tabular-nums'>
                            {clampedPage + 1} / {pageCount}
                        </span>
                        <button
                            type='button'
                            onClick={() => goToPage(Math.min(pageCount - 1, clampedPage + 1))}
                            disabled={clampedPage >= pageCount - 1}
                            className='inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-white text-neutral-600 transition-colors hover:bg-surface_muted disabled:pointer-events-none disabled:opacity-40'
                            aria-label='Вперёд'
                        >
                            <LuChevronRight className='h-4 w-4' />
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div ref={rootRef} className={`space-y-3 ${className}`}>
            {/* Toolbar */}
            {(searchable || toolbar || (columnsControl && !showPagination)) && (
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
                    {!showPagination && <div className='ml-auto'>{columnsControl}</div>}
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

            {renderPagination(true)}

            {/* Table */}
            <div className='overflow-x-auto rounded-2xl border border-line bg-white shadow-sm'>
                <table className='w-full text-sm'>
                    <thead className='sticky top-0 z-10 bg-surface_muted text-left text-xs font-medium uppercase tracking-wide text-neutral-500'>
                        <tr>
                            {expandable && <th className='w-8 px-2 py-3' />}
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
                                const rowExpandable = canExpand(row)
                                const isExpanded = rowExpandable && expanded.has(id)
                                const href = rowHref ? rowHref(row) : null
                                // Клик по строке раскрывает деталь, если своего
                                // обработчика нет: у раскрываемой таблицы это
                                // ожидаемое поведение, а переход по ссылке
                                // остаётся на самих ссылках внутри ячеек.
                                const handleClick = href
                                    ? e => {
                                          if (fromInteractive(e)) return
                                          if (opensNewTab(e)) {
                                              window.open(href, "_blank", "noopener")
                                              return
                                          }
                                          router.push(href)
                                      }
                                    : onRowClick
                                      ? e => {
                                            if (fromInteractive(e)) return
                                            onRowClick(row)
                                        }
                                      : rowExpandable
                                        ? e => {
                                              if (fromInteractive(e)) return
                                              toggleExpanded(id)
                                          }
                                        : undefined
                                // Средняя кнопка: гасим автоскролл на mousedown
                                // (сам клик приходит уже в onAuxClick).
                                const handleMouseDown = href
                                    ? e => {
                                          if (e.button === 1 && !fromInteractive(e))
                                              e.preventDefault()
                                      }
                                    : undefined
                                const handleAuxClick = href
                                    ? e => {
                                          if (e.button !== 1 || fromInteractive(e)) return
                                          window.open(href, "_blank", "noopener")
                                      }
                                    : undefined
                                return (
                                    <Fragment key={id}>
                                        <tr
                                            onClick={handleClick}
                                            onMouseDown={handleMouseDown}
                                            onAuxClick={handleAuxClick}
                                            className={`border-t border-line transition-colors ${handleClick ? "cursor-pointer" : ""} ${
                                                isSelected
                                                    ? "bg-brand_main/5"
                                                    : isExpanded
                                                      ? "bg-surface_muted"
                                                      : "hover:bg-surface_muted"
                                            } ${rowClassName ? rowClassName(row) : ""}`}
                                        >
                                            {expandable && (
                                                <td className='w-8 px-2 py-3.5'>
                                                    {rowExpandable && (
                                                        <button
                                                            type='button'
                                                            onClick={e => {
                                                                e.stopPropagation()
                                                                toggleExpanded(id)
                                                            }}
                                                            aria-expanded={isExpanded}
                                                            aria-label={
                                                                isExpanded
                                                                    ? "Свернуть"
                                                                    : "Развернуть"
                                                            }
                                                            className='inline-flex h-6 w-6 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700'
                                                        >
                                                            {isExpanded ? (
                                                                <LuChevronDown className='h-4 w-4' />
                                                            ) : (
                                                                <LuChevronRight className='h-4 w-4' />
                                                            )}
                                                        </button>
                                                    )}
                                                </td>
                                            )}
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
                                        {isExpanded && (
                                            <tr className='bg-surface_muted/60'>
                                                <td colSpan={colSpan} className='py-3 pl-12 pr-4'>
                                                    {/* w-0 + min-w-full: таблица считает ширины
                                                        колонок автоматически, и содержимое
                                                        раскрытия участвовало бы в расчёте — колонки
                                                        шапки дёргались при каждой смене детали.
                                                        Нулевая ширина убирает деталь из расчёта, а
                                                        min-width растягивает её по ячейке при
                                                        отрисовке. */}
                                                    <div className='w-0 min-w-full'>
                                                        {/* Отступ + полоса слева: деталь читается как
                                                            ветка своей строки, а не как ещё одна строка
                                                            таблицы. */}
                                                        <div className='rounded-r-lg border-l-2 border-brand_main/40 bg-white/70 py-1 pl-4 pr-3'>
                                                            {expandable.render(row)}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </Fragment>
                                )
                            })}
                    </tbody>
                    {footer && !loading && total > 0 && (
                        <tfoot className='bg-surface_muted'>{footer}</tfoot>
                    )}
                </table>
            </div>

            {/* Pagination */}
            {renderPagination()}
        </div>
    )
}
