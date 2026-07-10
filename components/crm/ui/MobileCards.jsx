// Примитивы мобильного (карточного) представления списков CRM.
// Таблицы остаются на md+, ниже — карточки: <div className='space-y-3 md:hidden'>.

export function CardListSkeleton({ rows = 4 }) {
    return (
        <>
            {Array.from({ length: rows }).map((_, i) => (
                <div
                    key={i}
                    className='space-y-2 rounded-2xl border border-line bg-white p-4 shadow-sm'
                >
                    <div className='h-4 w-2/3 animate-pulse rounded bg-neutral-100' />
                    <div className='h-3 w-1/2 animate-pulse rounded bg-neutral-100' />
                    <div className='h-3 w-3/4 animate-pulse rounded bg-neutral-100' />
                </div>
            ))}
        </>
    )
}

export function MobileCard({ onClick, children, className = "" }) {
    return (
        <div
            onClick={onClick}
            className={`rounded-2xl border border-line bg-white p-4 shadow-sm ${
                onClick ? "cursor-pointer transition-colors active:bg-surface_muted" : ""
            } ${className}`}
        >
            {children}
        </div>
    )
}

export function CardRow({ label, children }) {
    return (
        <div className='flex items-baseline justify-between gap-3 text-sm'>
            <span className='shrink-0 text-xs text-neutral-500'>{label}</span>
            <span className='min-w-0 truncate text-right text-neutral-700'>{children}</span>
        </div>
    )
}
