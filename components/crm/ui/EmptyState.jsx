import { LuInbox } from "react-icons/lu"

export default function EmptyState({
    icon: Icon = LuInbox,
    title,
    hint,
    action,
    compact = false,
    colSpan,
}) {
    const inner = (
        <div
            className={`flex flex-col items-center justify-center rounded-lg border border-dashed border-brand_soft/50 px-4 text-center ${
                compact ? "py-4" : "py-8"
            }`}
        >
            <Icon
                className={`mb-2 text-brand_main/60 ${compact ? "h-5 w-5" : "h-7 w-7"}`}
            />
            <p className='text-sm font-medium text-night_green'>{title}</p>
            {hint && (
                <p className='mt-1 max-w-md text-xs text-night_green/55'>{hint}</p>
            )}
            {action && <div className='mt-3'>{action}</div>}
        </div>
    )

    if (colSpan) {
        return (
            <tr>
                <td colSpan={colSpan} className='px-4 py-3'>
                    {inner}
                </td>
            </tr>
        )
    }
    return inner
}
