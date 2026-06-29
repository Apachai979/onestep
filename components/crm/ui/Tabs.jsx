"use client"

export default function Tabs({ items, value, onChange, className = "" }) {
    return (
        <div
            className={`flex flex-wrap gap-1 border-b border-brand_soft/30 ${className}`}
        >
            {items.map(t => {
                const active = t.key === value
                const Icon = t.icon
                return (
                    <button
                        key={t.key}
                        type='button'
                        onClick={() => onChange(t.key)}
                        className={`inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm transition -mb-px ${
                            active
                                ? "border-brand_main text-night_green font-semibold"
                                : "border-transparent text-night_green/60 hover:text-night_green hover:border-brand_soft/60"
                        }`}
                    >
                        {Icon && <Icon className='h-4 w-4' />}
                        {t.label}
                        {t.badge != null && t.badge > 0 && (
                            <span
                                className={`ml-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-semibold ${
                                    t.urgent
                                        ? "bg-red-500 text-white"
                                        : active
                                          ? "bg-brand_main text-white"
                                          : "bg-brand_soft/60 text-night_green/80"
                                }`}
                            >
                                {t.badge}
                            </span>
                        )}
                    </button>
                )
            })}
        </div>
    )
}
