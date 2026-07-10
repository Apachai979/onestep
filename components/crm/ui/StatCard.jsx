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

export default function StatCard({ label, value, href, icon: Icon, tone = "neutral", hint }) {
    const t = TONES[tone] || TONES.neutral
    const inner = (
        <>
            <div className='min-w-0'>
                <p className='truncate text-xs font-medium uppercase tracking-wide text-neutral-500'>
                    {label}
                </p>
                <p className={`mt-2 text-3xl font-semibold leading-none ${t.value}`}>
                    {value}
                </p>
                {hint && <p className='mt-1 text-xs text-neutral-400'>{hint}</p>}
            </div>
            {Icon && <Icon className={`hidden h-6 w-6 shrink-0 sm:block ${t.icon}`} />}
        </>
    )

    const base =
        "flex items-start justify-between gap-3 rounded-2xl border border-line bg-white p-5 shadow-sm"

    if (href) {
        return (
            <Link
                href={href}
                className={`${base} transition-all duration-200 ease-out hover:shadow-md hover:border-line_strong`}
            >
                {inner}
            </Link>
        )
    }
    return <div className={base}>{inner}</div>
}
