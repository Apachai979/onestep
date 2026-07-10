"use client"
import { useCallback, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { LuX } from "react-icons/lu"

const SIZES = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-2xl",
    "2xl": "max-w-3xl",
}

// Современный Dialog: backdrop-blur, анимация, ESC-close, focus-trap, портал.
// Управляется через `open` / `onClose`. Контент — children.
export default function Modal({
    open,
    onClose,
    title,
    description,
    size = "md",
    footer,
    closeOnBackdrop = true,
    className = "",
    children,
}) {
    const [mounted, setMounted] = useState(false)
    const panelRef = useRef(null)

    useEffect(() => setMounted(true), [])

    // ESC + блокировка скролла фона
    useEffect(() => {
        if (!open) return
        function onKey(e) {
            if (e.key === "Escape") {
                e.stopPropagation()
                onClose?.()
            }
        }
        document.addEventListener("keydown", onKey)
        const prev = document.body.style.overflow
        document.body.style.overflow = "hidden"
        return () => {
            document.removeEventListener("keydown", onKey)
            document.body.style.overflow = prev
        }
    }, [open, onClose])

    // Автофокус на панель для клавиатурной навигации
    useEffect(() => {
        if (open && panelRef.current) {
            const focusable = panelRef.current.querySelector(
                "input, textarea, select, button, [href], [tabindex]:not([tabindex='-1'])",
            )
            ;(focusable || panelRef.current).focus?.()
        }
    }, [open])

    // Примитивный focus-trap: Tab не выходит за пределы панели
    const onKeyDown = useCallback(e => {
        if (e.key !== "Tab" || !panelRef.current) return
        const nodes = panelRef.current.querySelectorAll(
            "input:not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled]), [href], [tabindex]:not([tabindex='-1'])",
        )
        if (nodes.length === 0) return
        const first = nodes[0]
        const last = nodes[nodes.length - 1]
        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault()
            last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault()
            first.focus()
        }
    }, [])

    if (!mounted || !open) return null

    return createPortal(
        <div
            className='fixed inset-0 z-[90] flex items-center justify-center p-4'
            role='dialog'
            aria-modal='true'
            aria-label={typeof title === "string" ? title : undefined}
            onMouseDown={closeOnBackdrop ? () => onClose?.() : undefined}
        >
            <div className='absolute inset-0 bg-neutral-900/40 backdrop-blur-sm animate-apparition' />
            <div
                ref={panelRef}
                tabIndex={-1}
                onMouseDown={e => e.stopPropagation()}
                onKeyDown={onKeyDown}
                className={`relative w-full ${SIZES[size] || SIZES.md} max-h-[90vh] overflow-y-auto rounded-2xl border border-line bg-white shadow-2xl shadow-neutral-900/20 animate-emersion focus:outline-none ${className}`}
            >
                {(title || onClose) && (
                    <div className='flex items-start justify-between gap-3 border-b border-line px-6 py-4'>
                        <div className='min-w-0'>
                            {title && (
                                <h3 className='text-base font-semibold text-neutral-900'>
                                    {title}
                                </h3>
                            )}
                            {description && (
                                <p className='mt-1 text-sm text-neutral-500'>{description}</p>
                            )}
                        </div>
                        {onClose && (
                            <button
                                type='button'
                                onClick={onClose}
                                aria-label='Закрыть'
                                className='-mr-1.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700'
                            >
                                <LuX className='h-4 w-4' />
                            </button>
                        )}
                    </div>
                )}
                <div className='px-6 py-5'>{children}</div>
                {footer && (
                    <div className='flex justify-end gap-2 border-t border-line px-6 py-4'>
                        {footer}
                    </div>
                )}
            </div>
        </div>,
        document.body,
    )
}
