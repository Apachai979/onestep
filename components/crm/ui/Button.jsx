import Link from "next/link"
import { forwardRef } from "react"
import Spinner from "./Spinner"

// Единая кнопка дизайн-системы CRM.
// variant: primary | secondary | ghost | danger | danger_soft
// size:    sm | md
// Рендерится как <button>, либо как <Link> (если передан href), либо как
// произвольный элемент через проп `as`.

const BASE =
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand_main/40 focus-visible:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none"

const VARIANTS = {
    primary: "bg-brand_main text-white shadow-sm hover:bg-brand_main/90 active:bg-brand_main",
    secondary:
        "bg-white text-neutral-800 border border-line shadow-sm hover:bg-surface_muted active:bg-surface_hover",
    ghost: "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900",
    danger: "bg-red-600 text-white shadow-sm hover:bg-red-700 active:bg-red-800",
    danger_soft:
        "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 active:bg-red-100",
}

const SIZES = {
    sm: "h-8 px-3 text-sm",
    md: "h-10 px-4 text-sm",
}

const ICON_SIZES = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
}

const Button = forwardRef(function Button(
    {
        as,
        href,
        variant = "primary",
        size = "md",
        iconOnly = false,
        loading = false,
        disabled = false,
        className = "",
        children,
        ...rest
    },
    ref,
) {
    const sizeClass = iconOnly ? ICON_SIZES[size] || ICON_SIZES.md : SIZES[size] || SIZES.md
    const cls = `${BASE} ${VARIANTS[variant] || VARIANTS.primary} ${sizeClass} ${className}`

    const content = (
        <>
            {loading && <Spinner size='sm' />}
            {children}
        </>
    )

    if (href && !disabled) {
        return (
            <Link ref={ref} href={href} className={cls} {...rest}>
                {content}
            </Link>
        )
    }

    const Comp = as || "button"
    return (
        <Comp
            ref={ref}
            className={cls}
            disabled={Comp === "button" ? disabled || loading : undefined}
            aria-disabled={disabled || loading || undefined}
            {...rest}
        >
            {content}
        </Comp>
    )
})

export default Button
