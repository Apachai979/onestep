// Примитивы мобильного (карточного) представления списков CRM.
// Таблицы остаются на md+, ниже — карточки: <div className='space-y-3 md:hidden'>.

export function CardListSkeleton({ rows = 4 }) {
    return (
        <>
            {Array.from({ length: rows }).map((_, i) => (
                <div
                    key={i}
                    className='space-y-2 rounded-xl border border-brand_soft/40 bg-white/70 p-4'
                >
                    <div className='h-4 w-2/3 animate-pulse rounded bg-brand_soft/50' />
                    <div className='h-3 w-1/2 animate-pulse rounded bg-brand_soft/40' />
                    <div className='h-3 w-3/4 animate-pulse rounded bg-brand_soft/40' />
                </div>
            ))}
        </>
    )
}

export function MobileCard({ onClick, children, className = "" }) {
    return (
        <div
            onClick={onClick}
            className={`rounded-xl border border-brand_soft/40 bg-white/80 p-4 shadow-sm ${
                onClick ? "cursor-pointer transition active:bg-brand_soft/20" : ""
            } ${className}`}
        >
            {children}
        </div>
    )
}

export function CardRow({ label, children }) {
    return (
        <div className='flex items-baseline justify-between gap-3 text-sm'>
            <span className='shrink-0 text-xs text-night_green/55'>{label}</span>
            <span className='min-w-0 truncate text-right text-gray-700'>{children}</span>
        </div>
    )
}
