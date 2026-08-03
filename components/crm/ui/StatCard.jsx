import Link from "next/link"

// KPI-плитка: крупное значение + подпись + иконка. tone красит только акценты,
// поверхность остаётся нейтральной (Vercel/Linear-стиль).
const TONES = {
    neutral: { value: "text-neutral-900", icon: "text-neutral-300" },
    brand: { value: "text-brand_main", icon: "text-brand_main/40" },
    danger: { value: "text-red-600", icon: "text-red-300" },
    warn: { value: "text-amber-600", icon: "text-amber-300" },
    success: { value: "text-emerald-600", icon: "text-emerald-300" },
}

// size="sm" — плотный вариант для страниц, где плитки лишь подпись к таблице
// и не должны съедать первый экран.
const SIZES = {
    md: { pad: "p-5", value: "text-3xl", gap: "mt-2", icon: "h-6 w-6" },
    sm: { pad: "p-3.5", value: "text-2xl", gap: "mt-1", icon: "h-5 w-5" },
}

export default function StatCard({
    label,
    value,
    href,
    icon: Icon,
    tone = "neutral",
    size = "md",
    hint,
}) {
    const t = TONES[tone] || TONES.neutral
    const s = SIZES[size] || SIZES.md
    const inner = (
        <>
            <div className='min-w-0'>
                <p className='truncate text-xs font-medium uppercase tracking-wide text-neutral-500'>
                    {label}
                </p>
                <p className={`${s.gap} font-semibold leading-none ${s.value} ${t.value}`}>
                    {value}
                </p>
                {hint && <p className='mt-1 text-xs text-neutral-400'>{hint}</p>}
            </div>
            {Icon && <Icon className={`hidden shrink-0 sm:block ${s.icon} ${t.icon}`} />}
        </>
    )

    const base = `flex items-start justify-between gap-3 rounded-2xl border border-line bg-white ${s.pad} shadow-sm`

    if (href) {
        return (
            <Link
                href={href}
                className={`${base} transition-all duration-200 ease-out hover:border-line_strong hover:shadow-md`}
            >
                {inner}
            </Link>
        )
    }
    return <div className={base}>{inner}</div>
}
