import Link from "next/link"
import { LuChevronLeft } from "react-icons/lu"

export default function PageHeader({ title, subtitle, back, actions }) {
    return (
        <div className='flex flex-wrap items-end justify-between gap-3'>
            <div className='min-w-0'>
                {back && (
                    <Link
                        href={back.href}
                        className='mb-1.5 inline-flex items-center gap-1 text-xs font-medium text-neutral-500 transition-colors hover:text-brand_main'
                    >
                        <LuChevronLeft className='h-3.5 w-3.5' />
                        {back.label || "Назад"}
                    </Link>
                )}
                <h1 className='truncate text-2xl font-semibold tracking-tight text-neutral-900'>
                    {title}
                </h1>
                {subtitle && (
                    <p className='mt-1 text-sm text-neutral-500'>{subtitle}</p>
                )}
            </div>
            {actions && <div className='flex flex-wrap gap-2'>{actions}</div>}
        </div>
    )
}
