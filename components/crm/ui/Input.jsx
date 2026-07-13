import { forwardRef, useId } from "react"

// Текстовое поле с floating-label. Если label не передан — обычный input.
// Сохраняет любые пропсы нативного input (name, value, onChange, type, ...).
const Input = forwardRef(function Input(
    { label, hint, error, required, icon: Icon, id, className = "", containerClassName = "", ...rest },
    ref,
) {
    const autoId = useId()
    const inputId = id || autoId
    const hasError = Boolean(error)

    const borderCls = hasError
        ? "border-red-300 focus:border-red-400 focus:ring-red-500/15"
        : "border-line focus:border-brand_main focus:ring-brand_main/20"

    if (!label) {
        return (
            <div className={containerClassName}>
                <div className='relative'>
                    {Icon && (
                        <Icon className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400' />
                    )}
                    <input
                        ref={ref}
                        id={inputId}
                        className={`h-10 w-full rounded-xl border bg-white text-sm text-neutral-900 shadow-sm transition-all duration-200 placeholder:text-neutral-400 focus:outline-none focus:ring-2 disabled:bg-surface_muted disabled:text-neutral-400 ${borderCls} ${Icon ? "pl-9 pr-3" : "px-3"} ${className}`}
                        {...rest}
                    />
                </div>
                {error ? (
                    <p className='mt-1 text-xs text-red-600'>{error}</p>
                ) : hint ? (
                    <p className='mt-1 text-xs text-neutral-400'>{hint}</p>
                ) : null}
            </div>
        )
    }

    // С реальным placeholder floating-механика не работает: пока поле пустое,
    // label «падал» бы в центр и накладывался на текст placeholder. В этом
    // случае держим подпись постоянно поднятой.
    const hasRealPlaceholder = Boolean(rest.placeholder)
    const labelFloatCls = hasRealPlaceholder
        ? ""
        : "peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-sm peer-placeholder-shown:text-neutral-400 peer-focus:top-2.5 peer-focus:translate-y-0 peer-focus:text-xs"

    return (
        <div className={containerClassName}>
            <div className='relative'>
                <input
                    ref={ref}
                    id={inputId}
                    placeholder=' '
                    className={`peer h-14 w-full rounded-xl border bg-white px-3 pt-5 pb-1.5 text-sm text-neutral-900 shadow-sm transition-all duration-200 placeholder:text-neutral-400 focus:outline-none focus:ring-2 disabled:bg-surface_muted disabled:text-neutral-400 ${borderCls} ${className}`}
                    {...rest}
                />
                <label
                    htmlFor={inputId}
                    className={`pointer-events-none absolute left-3 top-2.5 text-xs transition-all duration-200 ${labelFloatCls} ${hasError ? "text-red-500 peer-focus:text-red-500" : "text-neutral-500 peer-focus:text-brand_main"}`}
                >
                    {label}
                    {required && <span className='ml-0.5 text-red-500'>*</span>}
                </label>
            </div>
            {error ? (
                <p className='mt-1 text-xs text-red-600'>{error}</p>
            ) : hint ? (
                <p className='mt-1 text-xs text-neutral-400'>{hint}</p>
            ) : null}
        </div>
    )
})

export default Input
