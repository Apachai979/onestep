export default function TableSkeleton({ rows = 5, cols = 4 }) {
    return (
        <>
            {Array.from({ length: rows }).map((_, r) => (
                <tr key={r} className='border-t border-line'>
                    {Array.from({ length: cols }).map((_, c) => (
                        <td key={c} className='px-4 py-4'>
                            <div className='h-3 w-full max-w-[180px] animate-pulse rounded bg-neutral-100' />
                        </td>
                    ))}
                </tr>
            ))}
        </>
    )
}
