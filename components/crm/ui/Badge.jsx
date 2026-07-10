// Пилюля-бейдж. Либо tone из палитры, либо готовые классы через className
// (для статус-мап вида DEAL_STATUS_COLORS).
const TONES = {
    neutral: "bg-neutral-100 text-neutral-600",
    brand: "bg-brand_main/10 text-brand_main",
    success: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-700",
    danger: "bg-red-50 text-red-700",
    info: "bg-sky-50 text-sky-700",
}

const SIZES = {
    sm: "px-1.5 py-0.5 text-[10px]",
    md: "px-2 py-0.5 text-xs",
}

export default function Badge({
    tone,
    size = "md",
    dot = false,
    className = "",
    children,
}) {
    // className с bg-/text- переопределяет tone (используется статус-мапами).
    const hasCustomColor = /(?:^|\s)(?:bg-|text-)/.test(className)
    const color = hasCustomColor ? "" : TONES[tone] || TONES.neutral
    return (
        <span
            className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full font-medium ${SIZES[size] || SIZES.md} ${color} ${className}`}
        >
            {dot && <span className='h-1.5 w-1.5 rounded-full bg-current opacity-70' />}
            {children}
        </span>
    )
}
