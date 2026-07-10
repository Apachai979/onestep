"use client"
import { cloneElement, useEffect, useRef, useState } from "react"

// Лёгкое контекстное меню / quick actions. Закрывается по клику вне и ESC.
// trigger — элемент-триггер; children — пункты (DropdownItem / DropdownSeparator).
export default function Dropdown({ trigger, align = "right", className = "", children }) {
    const [open, setOpen] = useState(false)
    const ref = useRef(null)

    useEffect(() => {
        if (!open) return
        function onDoc(e) {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false)
        }
        function onKey(e) {
            if (e.key === "Escape") setOpen(false)
        }
        document.addEventListener("mousedown", onDoc)
        document.addEventListener("keydown", onKey)
        return () => {
            document.removeEventListener("mousedown", onDoc)
            document.removeEventListener("keydown", onKey)
        }
    }, [open])

    const triggerEl = cloneElement(trigger, {
        onClick: e => {
            trigger.props.onClick?.(e)
            setOpen(o => !o)
        },
        "aria-haspopup": "menu",
        "aria-expanded": open,
    })

    return (
        <div ref={ref} className='relative inline-flex'>
            {triggerEl}
            {open && (
                <div
                    role='menu'
                    className={`absolute top-full z-40 mt-1.5 min-w-[180px] overflow-hidden rounded-xl border border-line bg-white p-1 shadow-lg shadow-neutral-900/10 animate-emersion ${align === "right" ? "right-0" : "left-0"} ${className}`}
                    onClick={() => setOpen(false)}
                >
                    {children}
                </div>
            )}
        </div>
    )
}

export function DropdownItem({ icon: Icon, danger = false, className = "", children, ...rest }) {
    return (
        <button
            type='button'
            role='menuitem'
            className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${danger ? "text-red-600 hover:bg-red-50" : "text-neutral-700 hover:bg-neutral-100"} ${className}`}
            {...rest}
        >
            {Icon && <Icon className='h-4 w-4 shrink-0' />}
            <span className='min-w-0 flex-1 truncate'>{children}</span>
        </button>
    )
}

export function DropdownSeparator() {
    return <div className='my-1 h-px bg-line' />
}
