import Link from "next/link"
import { LuChevronLeft } from "react-icons/lu"

export default function PageHeader({ title, subtitle, back, actions }) {
    return (
        <div className='flex flex-wrap items-end justify-between gap-3'>
            <div className='min-w-0'>
                {back && (
                    <Link
                        href={back.href}
                        className='mb-1 inline-flex items-center gap-1 text-xs text-night_green/55 hover:text-brand_main'
                    >
                        <LuChevronLeft className='h-3 w-3' />
                        {back.label || "Назад"}
                    </Link>
                )}
                <h1 className='truncate text-2xl font-semibold text-night_green sm:text-3xl'>
                    {title}
                </h1>
                {subtitle && (
                    <p className='mt-1 text-sm text-night_green/65'>{subtitle}</p>
                )}
            </div>
            {actions && <div className='flex flex-wrap gap-2'>{actions}</div>}
        </div>
    )
}
