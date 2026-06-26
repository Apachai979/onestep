export default function TableSkeleton({ rows = 5, cols = 4 }) {
    return (
        <>
            {Array.from({ length: rows }).map((_, r) => (
                <tr key={r} className='border-t border-brand_soft/30'>
                    {Array.from({ length: cols }).map((_, c) => (
                        <td key={c} className='px-4 py-3'>
                            <div className='h-3 w-full max-w-[180px] animate-pulse rounded bg-brand_soft/50' />
                        </td>
                    ))}
                </tr>
            ))}
        </>
    )
}
