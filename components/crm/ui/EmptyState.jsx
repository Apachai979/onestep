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
            className={`flex flex-col items-center justify-center rounded-xl border border-dashed border-line px-4 text-center ${
                compact ? "py-6" : "py-10"
            }`}
        >
            <span
                className={`mb-3 inline-flex items-center justify-center rounded-full bg-neutral-100 text-neutral-400 ${compact ? "h-9 w-9" : "h-11 w-11"}`}
            >
                <Icon className={compact ? "h-4 w-4" : "h-5 w-5"} />
            </span>
            <p className='text-sm font-medium text-neutral-900'>{title}</p>
            {hint && (
                <p className='mt-1 max-w-md text-xs text-neutral-500'>{hint}</p>
            )}
            {action && <div className='mt-4'>{action}</div>}
        </div>
    )

    if (colSpan) {
        return (
            <tr>
                <td colSpan={colSpan} className='px-4 py-4'>
                    {inner}
                </td>
            </tr>
        )
    }
    return inner
}
