import { forwardRef, useId } from "react"
import { LuChevronDown } from "react-icons/lu"
import Field from "./Field"

// Нативный select в едином стиле. Верхняя подпись (floating на select неудобен).
const Select = forwardRef(function Select(
    { label, hint, error, required, id, className = "", containerClassName = "", children, ...rest },
    ref,
) {
    const autoId = useId()
    const selectId = id || autoId
    const hasError = Boolean(error)
    const borderCls = hasError
        ? "border-red-300 focus:border-red-400 focus:ring-red-500/15"
        : "border-line focus:border-brand_main focus:ring-brand_main/20"

    const control = (
        <div className='relative'>
            <select
                ref={ref}
                id={selectId}
                className={`h-10 w-full appearance-none rounded-xl border bg-white pl-3 pr-9 text-sm text-neutral-900 shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 disabled:bg-surface_muted disabled:text-neutral-400 ${borderCls} ${className}`}
                {...rest}
            >
                {children}
            </select>
            <LuChevronDown className='pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400' />
        </div>
    )

    if (!label) {
        return (
            <div className={containerClassName}>
                {control}
                {error ? (
                    <p className='mt-1 text-xs text-red-600'>{error}</p>
                ) : hint ? (
                    <p className='mt-1 text-xs text-neutral-400'>{hint}</p>
                ) : null}
            </div>
        )
    }

    return (
        <Field
            label={label}
            hint={hint}
            error={error}
            required={required}
            htmlFor={selectId}
            className={containerClassName}
        >
            {control}
        </Field>
    )
})

export default Select
