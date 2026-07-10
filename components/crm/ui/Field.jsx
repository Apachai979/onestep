// Обёртка для контролов с верхней подписью, подсказкой и ошибкой.
// Используется для Select и произвольных контролов, где floating-label неудобен.
export default function Field({
    label,
    hint,
    error,
    required,
    htmlFor,
    className = "",
    children,
}) {
    return (
        <div className={className}>
            {label && (
                <label
                    htmlFor={htmlFor}
                    className='mb-1.5 block text-xs font-medium text-neutral-500'
                >
                    {label}
                    {required && <span className='ml-0.5 text-red-500'>*</span>}
                </label>
            )}
            {children}
            {error ? (
                <p className='mt-1 text-xs text-red-600'>{error}</p>
            ) : hint ? (
                <p className='mt-1 text-xs text-neutral-400'>{hint}</p>
            ) : null}
        </div>
    )
}
