"use client"

import { useCallback, useEffect, useRef, useState } from "react"

// Зона у края доски, в которой перетаскиваемая карточка начинает прокрутку.
const EDGE_ZONE = 80
const EDGE_STEP = 14

/**
 * Горизонтальная прокрутка доски канбана.
 *
 * Родной ползунок висит под самой доской, а колонки бывают в несколько экранов
 * высотой — на небольшом мониторе он уезжает далеко за нижний край окна, и
 * кажется, что уехавших вправо колонок просто нет. Поэтому родной ползунок
 * прячем, а вместо него держим его двойник, прилипший к низу окна. Появляется
 * он только когда колонки действительно не влезли: на широком мониторе доска
 * выглядит как раньше.
 */
export default function KanbanScroller({ children, className = "" }) {
    const viewportRef = useRef(null)
    const rowRef = useRef(null)
    const trackRef = useRef(null)
    const [contentWidth, setContentWidth] = useState(0)
    const [overflowing, setOverflowing] = useState(false)

    const measure = useCallback(() => {
        const viewport = viewportRef.current
        if (!viewport) return
        setContentWidth(viewport.scrollWidth)
        setOverflowing(viewport.scrollWidth - viewport.clientWidth > 1)
    }, [])

    // Ширина доски меняется и от окна, и от данных (подгрузились карточки —
    // выросла колонка, но не ширина), поэтому смотрим за обоими элементами.
    useEffect(() => {
        measure()
        if (typeof ResizeObserver === "undefined") return undefined
        const observer = new ResizeObserver(measure)
        if (viewportRef.current) observer.observe(viewportRef.current)
        if (rowRef.current) observer.observe(rowRef.current)
        return () => observer.disconnect()
    }, [measure])

    // Синхронизация в обе стороны: присваиваем только при реальном расхождении,
    // иначе ответное событие scroll закольцевало бы обработчики.
    const sync = (source, target) => {
        if (!source || !target) return
        if (Math.abs(target.scrollLeft - source.scrollLeft) > 1)
            target.scrollLeft = source.scrollLeft
    }

    // Автопрокрутка при перетаскивании: без неё карточку не донести до колонки,
    // которая сейчас за краем экрана — курсор упирается в границу окна.
    const edgeRef = useRef(0)
    const frameRef = useRef(0)

    const stopEdgeScroll = useCallback(() => {
        edgeRef.current = 0
        if (frameRef.current) {
            cancelAnimationFrame(frameRef.current)
            frameRef.current = 0
        }
    }, [])

    useEffect(() => stopEdgeScroll, [stopEdgeScroll])

    // Крутим по кадрам, а не по событиям dragover: у неподвижного курсора
    // событий нет, а доска у края должна ехать сама.
    const runEdgeScroll = useCallback(() => {
        frameRef.current = 0
        const viewport = viewportRef.current
        if (!viewport || !edgeRef.current) return
        viewport.scrollLeft += edgeRef.current * EDGE_STEP
        sync(viewport, trackRef.current)
        frameRef.current = requestAnimationFrame(runEdgeScroll)
    }, [])

    const onDragOver = event => {
        const viewport = viewportRef.current
        if (!viewport) return
        const box = viewport.getBoundingClientRect()
        const direction =
            event.clientX > box.right - EDGE_ZONE
                ? 1
                : event.clientX < box.left + EDGE_ZONE
                  ? -1
                  : 0
        edgeRef.current = direction
        if (!direction) stopEdgeScroll()
        else if (!frameRef.current) frameRef.current = requestAnimationFrame(runEdgeScroll)
    }

    return (
        <div className={`relative ${className}`}>
            <div
                ref={viewportRef}
                onScroll={() => sync(viewportRef.current, trackRef.current)}
                onDragOver={onDragOver}
                onDragEnd={stopEdgeScroll}
                onDrop={stopEdgeScroll}
                className='crm-board-viewport overflow-x-auto pb-3'
            >
                <div ref={rowRef} className='flex w-max gap-3'>
                    {children}
                </div>
            </div>
            {overflowing && (
                <div
                    ref={trackRef}
                    onScroll={() => sync(trackRef.current, viewportRef.current)}
                    className='crm-board-scrollbar sticky bottom-1 z-10 overflow-x-auto'
                    aria-hidden='true'
                >
                    <div className='h-px' style={{ width: contentWidth }} />
                </div>
            )}
        </div>
    )
}
