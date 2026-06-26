"use client"
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { LuAlertTriangle } from "react-icons/lu"

const ConfirmContext = createContext(null)

export function useConfirm() {
    const ctx = useContext(ConfirmContext)
    if (!ctx) {
        // Fallback to native confirm if provider missing.
        return opts =>
            Promise.resolve(
                typeof window !== "undefined"
                    ? window.confirm(
                          typeof opts === "string"
                              ? opts
                              : opts?.title || "Подтвердить действие?",
                      )
                    : false,
            )
    }
    return ctx
}

const DEFAULTS = {
    title: "Подтвердите действие",
    description: "",
    confirmText: "Подтвердить",
    cancelText: "Отмена",
    variant: "default",
}

export function ConfirmProvider({ children }) {
    const [state, setState] = useState(null)
    const [mounted, setMounted] = useState(false)
    const resolverRef = useRef(null)

    useEffect(() => {
        setMounted(true)
    }, [])

    const open = useCallback(opts => {
        return new Promise(resolve => {
            resolverRef.current = resolve
            const normalized =
                typeof opts === "string" ? { title: opts } : opts || {}
            setState({ ...DEFAULTS, ...normalized })
        })
    }, [])

    const finish = useCallback(result => {
        if (resolverRef.current) resolverRef.current(result)
        resolverRef.current = null
        setState(null)
    }, [])

    useEffect(() => {
        if (!state) return
        function onKey(e) {
            if (e.key === "Escape") finish(false)
            if (e.key === "Enter") finish(true)
        }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [state, finish])

    return (
        <ConfirmContext.Provider value={open}>
            {children}
            {mounted &&
                state &&
                createPortal(
                    <ConfirmDialog state={state} onFinish={finish} />,
                    document.body,
                )}
        </ConfirmContext.Provider>
    )
}

function ConfirmDialog({ state, onFinish }) {
    const danger = state.variant === "danger"
    return (
        <div
            className='fixed inset-0 z-[90] flex items-center justify-center p-4'
            onClick={() => onFinish(false)}
        >
            <div className='absolute inset-0 bg-night_green/40 backdrop-blur-sm' />
            <div
                onClick={e => e.stopPropagation()}
                className='relative w-full max-w-sm animate-emersion rounded-xl border border-brand_soft/40 bg-white p-5 shadow-2xl shadow-night_green/20'
            >
                <div className='flex items-start gap-3'>
                    {danger && (
                        <span className='inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600'>
                            <LuAlertTriangle className='h-5 w-5' />
                        </span>
                    )}
                    <div className='min-w-0 flex-1'>
                        <h3 className='text-base font-semibold text-night_green'>
                            {state.title}
                        </h3>
                        {state.description && (
                            <p className='mt-1 whitespace-pre-wrap text-sm text-night_green/70'>
                                {state.description}
                            </p>
                        )}
                    </div>
                </div>
                <div className='mt-5 flex justify-end gap-2'>
                    <button
                        type='button'
                        onClick={() => onFinish(false)}
                        className='rounded-lg border border-brand_soft/60 bg-white px-4 py-2 text-sm font-medium text-night_green hover:bg-brand_soft/30'
                    >
                        {state.cancelText}
                    </button>
                    <button
                        type='button'
                        autoFocus
                        onClick={() => onFinish(true)}
                        className={`rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition ${
                            danger
                                ? "bg-red-600 hover:bg-red-700"
                                : "bg-brand_main hover:bg-brand_main/90"
                        }`}
                    >
                        {state.confirmText}
                    </button>
                </div>
            </div>
        </div>
    )
}
