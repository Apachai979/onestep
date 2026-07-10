"use client"
import { createContext, useCallback, useContext, useEffect, useState } from "react"
import { createPortal } from "react-dom"
import {
    LuCheck,
    LuAlertCircle,
    LuInfo,
    LuAlertTriangle,
    LuX,
} from "react-icons/lu"

const ToastContext = createContext(null)

let nextId = 1

export function useToast() {
    const ctx = useContext(ToastContext)
    if (!ctx) {
        // Safe fallback if provider missing — keeps callsites simple.
        return {
            success: m => console.log("[toast]", m),
            error: m => console.error("[toast]", m),
            info: m => console.log("[toast]", m),
            warn: m => console.warn("[toast]", m),
            show: () => {},
            dismiss: () => {},
        }
    }
    return ctx
}

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([])
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    const dismiss = useCallback(id => {
        setToasts(t => t.filter(x => x.id !== id))
    }, [])

    const show = useCallback(
        opts => {
            const id = nextId++
            const t = {
                id,
                variant: opts.variant || "info",
                title: opts.title || opts.message || "",
                description: opts.title ? opts.message : opts.description || null,
                duration: opts.duration ?? 4000,
            }
            setToasts(curr => [...curr, t])
            if (t.duration > 0) {
                setTimeout(() => dismiss(id), t.duration)
            }
            return id
        },
        [dismiss],
    )

    const api = {
        show,
        dismiss,
        success: (message, opts = {}) => show({ ...opts, variant: "success", message }),
        error: (message, opts = {}) =>
            show({ duration: 6000, ...opts, variant: "error", message }),
        info: (message, opts = {}) => show({ ...opts, variant: "info", message }),
        warn: (message, opts = {}) => show({ ...opts, variant: "warn", message }),
    }

    return (
        <ToastContext.Provider value={api}>
            {children}
            {mounted &&
                createPortal(
                    <ToastViewport toasts={toasts} onDismiss={dismiss} />,
                    document.body,
                )}
        </ToastContext.Provider>
    )
}

function ToastViewport({ toasts, onDismiss }) {
    return (
        <div
            className='pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-end gap-2 p-4 sm:p-6'
            aria-live='polite'
        >
            <div className='flex w-full max-w-sm flex-col gap-2'>
                {toasts.map(t => (
                    <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
                ))}
            </div>
        </div>
    )
}

const VARIANT = {
    success: {
        Icon: LuCheck,
        bg: "bg-white border-l-4 border-green-500",
        iconBg: "bg-green-100 text-green-700",
    },
    error: {
        Icon: LuAlertCircle,
        bg: "bg-white border-l-4 border-red-500",
        iconBg: "bg-red-100 text-red-700",
    },
    warn: {
        Icon: LuAlertTriangle,
        bg: "bg-white border-l-4 border-amber-500",
        iconBg: "bg-amber-100 text-amber-700",
    },
    info: {
        Icon: LuInfo,
        bg: "bg-white border-l-4 border-brand_main",
        iconBg: "bg-brand_main/10 text-brand_main",
    },
}

function ToastItem({ toast, onDismiss }) {
    const v = VARIANT[toast.variant] || VARIANT.info
    const { Icon } = v
    return (
        <div
            className={`pointer-events-auto flex items-start gap-3 rounded-xl p-3 shadow-lg shadow-neutral-900/10 animate-emersion ${v.bg}`}
            role='status'
        >
            <span
                className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${v.iconBg}`}
            >
                <Icon className='h-4 w-4' />
            </span>
            <div className='min-w-0 flex-1'>
                {toast.title && (
                    <p className='text-sm font-semibold text-neutral-900'>{toast.title}</p>
                )}
                {toast.description && (
                    <p className='mt-0.5 whitespace-pre-wrap text-xs text-neutral-500'>
                        {toast.description}
                    </p>
                )}
            </div>
            <button
                type='button'
                onClick={() => onDismiss(toast.id)}
                className='inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700'
                aria-label='Закрыть'
            >
                <LuX className='h-3.5 w-3.5' />
            </button>
        </div>
    )
}
