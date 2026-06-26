export default function Section({ title, icon: Icon, action, children, className = "" }) {
    return (
        <section
            className={`rounded-xl border border-brand_soft/40 bg-white/70 p-4 sm:p-5 ${className}`}
        >
            {(title || action) && (
                <div className='mb-3 flex items-center justify-between gap-3'>
                    {title && (
                        <h2 className='flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-night_green/70'>
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
