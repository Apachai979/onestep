// Блок длинной формы: заголовок + описание слева, поля справа (или в столбик).
// Помогает разбивать длинные формы на секции (Stripe/Attio-стиль).
export default function FormSection({
    title,
    description,
    columns = false,
    className = "",
    children,
}) {
    if (columns) {
        return (
            <section
                className={`grid gap-x-8 gap-y-4 border-t border-line pt-6 md:grid-cols-[220px_1fr] ${className}`}
            >
                <div>
                    {title && (
                        <h3 className='text-sm font-semibold text-neutral-900'>{title}</h3>
                    )}
                    {description && (
                        <p className='mt-1 text-xs text-neutral-500'>{description}</p>
                    )}
                </div>
                <div className='space-y-4'>{children}</div>
            </section>
        )
    }

    return (
        <section className={className}>
            {(title || description) && (
                <div className='mb-4'>
                    {title && (
                        <h3 className='text-sm font-semibold text-neutral-900'>{title}</h3>
                    )}
                    {description && (
                        <p className='mt-1 text-xs text-neutral-500'>{description}</p>
                    )}
                </div>
            )}
            <div className='space-y-4'>{children}</div>
        </section>
    )
}
