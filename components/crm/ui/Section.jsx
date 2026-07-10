export default function Section({ title, icon: Icon, action, children, className = "" }) {
    return (
        <section
            className={`rounded-2xl border border-line bg-white p-6 shadow-sm ${className}`}
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
