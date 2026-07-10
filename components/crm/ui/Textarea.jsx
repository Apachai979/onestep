import { forwardRef, useId } from "react"

// Многострочное поле с floating-label. Без label — обычная textarea.
const Textarea = forwardRef(function Textarea(
    { label, hint, error, required, id, rows = 4, className = "", containerClassName = "", ...rest },
    ref,
) {
    const autoId = useId()
    const inputId = id || autoId
    const hasError = Boolean(error)
    const borderCls = hasError
        ? "border-red-300 focus:border-red-400 focus:ring-red-500/15"
        : "border-line focus:border-brand_main focus:ring-brand_main/20"

    const base = `w-full rounded-xl border bg-white text-sm text-neutral-900 shadow-sm transition-all duration-200 placeholder:text-neutral-400 focus:outline-none focus:ring-2 disabled:bg-surface_muted disabled:text-neutral-400 ${borderCls}`

    if (!label) {
        return (
            <div className={containerClassName}>
                <textarea
                    ref={ref}
                    id={inputId}
                    rows={rows}
                    className={`${base} px-3 py-2 ${className}`}
                    {...rest}
                />
                {error ? (
                    <p className='mt-1 text-xs text-red-600'>{error}</p>
                ) : hint ? (
                    <p className='mt-1 text-xs text-neutral-400'>{hint}</p>
                ) : null}
            </div>
        )
    }

    return (
        <div className={containerClassName}>
            <div className='relative'>
                <textarea
                    ref={ref}
                    id={inputId}
                    rows={rows}
                    placeholder=' '
                    className={`peer ${base} px-3 pt-6 pb-2 ${className}`}
                    {...rest}
                />
                <label
                    htmlFor={inputId}
                    className={`pointer-events-none absolute left-3 top-2.5 text-xs transition-all duration-200 peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-placeholder-shown:text-neutral-400 peer-focus:top-2.5 peer-focus:text-xs ${hasError ? "text-red-500 peer-focus:text-red-500" : "text-neutral-500 peer-focus:text-brand_main"}`}
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

export default Textarea
