// Заголовок карточки-детали с опознавательным знаком типа сущности:
// цветной чип с названием типа над заголовком.
const TONES = {
    brand: "bg-brand_main/10 text-brand_main",
    blue: "bg-blue-50 text-blue-700",
    amber: "bg-amber-50 text-amber-700",
}

export default function EntityHeading({ label, tone = "brand", title, meta, children }) {
    const toneClass = TONES[tone] || TONES.brand

    return (
        <div className='min-w-0'>
            <div className='flex flex-wrap items-center gap-2'>
                <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${toneClass}`}
                >
                    {label}
                </span>
                {meta && <span className='text-xs text-neutral-500'>{meta}</span>}
            </div>
            <h1 className='mt-1 break-words text-lg font-semibold text-neutral-900 sm:text-xl'>
                {title}
            </h1>
            {children}
        </div>
    )
}
