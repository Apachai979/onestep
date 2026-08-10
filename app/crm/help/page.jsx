import { PageHeader } from "@/components/crm/ui"
import { HelpSection } from "@/components/crm/help/HelpKit"
import { HELP_SECTIONS } from "@/components/crm/help/sections"

export const metadata = { title: "Инструкция | CRM" }

export default function HelpPage() {
    return (
        <div className='space-y-5'>
            <PageHeader
                title='Инструкция для менеджеров'
                subtitle='Как устроена CRM и что делать в каждом разделе. Разделы можно читать по порядку или прыгать по оглавлению.'
            />

            <div className='grid items-start gap-5 lg:grid-cols-[220px_minmax(0,1fr)]'>
                {/* Оглавление: обычные якоря — работают без JS и переживают перезагрузку.
                    Липнет к верху экрана; если разделов станет больше, чем влезает,
                    прокручивается внутри себя. */}
                <nav className='rounded-2xl border border-line bg-white p-4 shadow-sm lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto'>
                    <p className='mb-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-400'>
                        Содержание
                    </p>
                    <ol className='space-y-0.5'>
                        {HELP_SECTIONS.map((s, i) => {
                            const Icon = s.icon
                            return (
                                <li key={s.id}>
                                    <a
                                        href={`#${s.id}`}
                                        className='group flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-neutral-900'
                                    >
                                        <Icon className='h-4 w-4 shrink-0 text-neutral-400 group-hover:text-brand_main' />
                                        <span className='min-w-0 flex-1'>{s.title}</span>
                                        <span className='shrink-0 text-[10px] text-neutral-300'>
                                            {i + 1}
                                        </span>
                                    </a>
                                </li>
                            )
                        })}
                    </ol>
                </nav>

                <div className='min-w-0 space-y-4'>
                    {HELP_SECTIONS.map(s => (
                        <HelpSection
                            key={s.id}
                            id={s.id}
                            title={s.title}
                            icon={s.icon}
                            lead={s.lead}
                        >
                            {s.content}
                        </HelpSection>
                    ))}
                </div>
            </div>
        </div>
    )
}
