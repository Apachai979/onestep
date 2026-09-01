// Секция карточки: та же чрома, что у Card (radius 16px, тонкая граница,
// мягкая тень), но семантический <section> и заголовок внутри.
// padding: "md" (p-6) — виджеты и панели; "sm" (p-4) — плотные карточки
// параметров на карточках-деталях; "none" — своя разметка внутри.
const PADDING = {
    none: "",
    sm: "p-4",
    md: "p-6",
}

export default function Section({
    title,
    icon: Icon,
    action,
    padding = "md",
    children,
    className = "",
}) {
    return (
        <section
            className={`rounded-2xl border border-line bg-white shadow-sm ${
                PADDING[padding] ?? PADDING.md
            } ${className}`}
        >
            {(title || action) && (
                <div className='mb-4 flex items-center justify-between gap-3'>
                    {title && (
                        <h2 className='flex items-center gap-2 text-sm font-semibold text-neutral-900'>
                            {Icon && <Icon className='h-4 w-4 text-brand_main' />}
                            {title}
                        </h2>
                    )}
                    {action && <div className='shrink-0'>{action}</div>}
                </div>
            )}
            {children}
        </section>
    )
}
