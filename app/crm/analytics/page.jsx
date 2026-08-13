import Link from "next/link"
import { LuArrowRight, LuWallet } from "react-icons/lu"
import { PageHeader } from "@/components/crm/ui"

export const metadata = { title: "Аналитика | CRM" }

// Витрина раздела. Отчёты добавляются сюда карточкой — пока он один, но список
// заведомо будет расти, поэтому у раздела своя страница, а не прямая ссылка на
// единственный отчёт из меню.
const REPORTS = [
    {
        href: "/crm/analytics/sales",
        title: "Продажи менеджеров",
        icon: LuWallet,
        description:
            "Сколько продал каждый менеджер за период: по проведённым отгрузкам, с разбивкой по месяцам, клиентам и товарам.",
    },
]

export default function AnalyticsPage() {
    return (
        <div className='space-y-5'>
            <PageHeader
                title='Аналитика'
                subtitle='Отчёты по работе отдела: продажи, клиенты, номенклатура.'
            />
            <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-3'>
                {REPORTS.map(r => (
                    <Link
                        key={r.href}
                        href={r.href}
                        className='group flex flex-col gap-2 rounded-2xl border border-line bg-white p-5 shadow-sm transition-all duration-200 ease-out hover:border-line_strong hover:shadow-md'
                    >
                        <span className='flex items-center gap-2'>
                            <r.icon className='h-5 w-5 shrink-0 text-brand_main' />
                            <span className='font-semibold text-neutral-900'>{r.title}</span>
                            <LuArrowRight className='ml-auto h-4 w-4 shrink-0 text-neutral-300 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-brand_main' />
                        </span>
                        <span className='text-sm leading-relaxed text-neutral-500'>
                            {r.description}
                        </span>
                    </Link>
                ))}
            </div>
        </div>
    )
}
