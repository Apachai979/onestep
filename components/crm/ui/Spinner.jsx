const SIZES = {
    sm: "h-3 w-3 border",
    md: "h-4 w-4 border-2",
    lg: "h-6 w-6 border-2",
}

export default function Spinner({ size = "md" }) {
    const cls = SIZES[size] || SIZES.md
    return (
        <span
            role='status'
            aria-label='Загрузка'
            className={`inline-block ${cls} animate-spin rounded-full border-neutral-200 border-t-brand_main`}
        />
    )
}
