"use client"

export default function Tabs({ items, value, onChange, className = "" }) {
    return (
        <div
            className={`flex flex-wrap gap-1 border-b border-line ${className}`}
        >
            {items.map(t => {
                const active = t.key === value
                const Icon = t.icon
                return (
                    <button
                        key={t.key}
                        type='button'
                        onClick={() => onChange(t.key)}
                        className={`-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm transition-all duration-200 ${
                            active
                                ? "border-brand_main font-semibold text-neutral-900"
                                : "border-transparent text-neutral-500 hover:border-neutral-200 hover:text-neutral-900"
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
                                          : "bg-neutral-100 text-neutral-500"
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
