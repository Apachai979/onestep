import Link from "next/link"

// Единая карточка дизайн-системы: radius 16px, тонкая граница, мягкая тень.
// interactive → hover-подъём (для кликабельных карточек/ссылок).
// href → рендер как <Link>. padding: "md" (p-6/24px) | "sm" (p-4) | "none".
const PADDING = {
    none: "",
    sm: "p-4",
    md: "p-6",
}

export default function Card({
    href,
    interactive = false,
    padding = "md",
    className = "",
    children,
    ...rest
}) {
    const base = `rounded-2xl border border-line bg-white shadow-sm ${PADDING[padding] ?? PADDING.md}`
    const hover = interactive || href
        ? "transition-all duration-200 ease-out hover:shadow-md hover:border-line_strong"
        : ""
    const cls = `${base} ${hover} ${className}`

    if (href) {
        return (
            <Link href={href} className={`block ${cls}`} {...rest}>
                {children}
            </Link>
        )
    }
    return (
        <div className={cls} {...rest}>
            {children}
        </div>
    )
}

// Заголовок секции внутри карточки/виджета.
export function CardHeader({ title, icon: Icon, action, className = "" }) {
    return (
        <div className={`mb-4 flex items-center justify-between gap-3 ${className}`}>
            {title && (
                <h2 className='flex items-center gap-2 text-sm font-semibold text-neutral-900'>
                    {Icon && <Icon className='h-4 w-4 text-brand_main' />}
                    {title}
                </h2>
            )}
            {action && <div className='shrink-0'>{action}</div>}
        </div>
    )
}
