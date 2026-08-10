import { LuInfo, LuAlertTriangle } from "react-icons/lu"

/** Раздел инструкции: якорь для оглавления + заголовок с иконкой. */
export function HelpSection({ id, title, icon: Icon, lead, children }) {
    return (
        <section
            id={id}
            // scroll-mt — чтобы якорь не уезжал под липкую шапку на мобильном.
            className='scroll-mt-20 rounded-2xl border border-line bg-white p-6 shadow-sm'
        >
            <h2 className='flex items-center gap-2 text-lg font-semibold tracking-tight text-neutral-900'>
                {Icon && <Icon className='h-5 w-5 shrink-0 text-brand_main' />}
                {title}
            </h2>
            {lead && <p className='mt-2 text-sm text-neutral-500'>{lead}</p>}
            <div className='mt-4 space-y-3 text-sm leading-relaxed text-neutral-700'>
                {children}
            </div>
        </section>
    )
}

/** Подзаголовок внутри раздела. */
export function HelpTopic({ title, children }) {
    return (
        <div className='pt-2'>
            <h3 className='text-sm font-semibold text-neutral-900'>{title}</h3>
            <div className='mt-2 space-y-2'>{children}</div>
        </div>
    )
}

/** Нумерованный сценарий: «что нажать по шагам». */
export function Steps({ items }) {
    return (
        <ol className='space-y-2'>
            {items.map((text, i) => (
                <li key={i} className='flex gap-3'>
                    <span className='mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand_main/10 text-[11px] font-semibold text-brand_main'>
                        {i + 1}
                    </span>
                    <span className='min-w-0 flex-1'>{text}</span>
                </li>
            ))}
        </ol>
    )
}

/** Маркированный список без нумерации. */
export function Bullets({ items }) {
    return (
        <ul className='space-y-1.5'>
            {items.map((text, i) => (
                <li key={i} className='flex gap-2'>
                    <span className='mt-2 inline-block h-1 w-1 shrink-0 rounded-full bg-neutral-300' />
                    <span className='min-w-0 flex-1'>{text}</span>
                </li>
            ))}
        </ul>
    )
}

/** Пояснение «как устроено» — синяя плашка. */
export function Note({ children }) {
    return (
        <div className='flex gap-2 rounded-xl border border-blue-200 bg-blue-50/60 px-3 py-2.5 text-[13px] text-blue-900'>
            <LuInfo className='mt-0.5 h-4 w-4 shrink-0 text-blue-500' />
            <div className='min-w-0 flex-1'>{children}</div>
        </div>
    )
}

/** Ограничение системы, о которое чаще всего спотыкаются, — жёлтая плашка. */
export function Rule({ children }) {
    return (
        <div className='flex gap-2 rounded-xl border border-amber-200 bg-amber-50/60 px-3 py-2.5 text-[13px] text-amber-900'>
            <LuAlertTriangle className='mt-0.5 h-4 w-4 shrink-0 text-amber-500' />
            <div className='min-w-0 flex-1'>{children}</div>
        </div>
    )
}

/** Название кнопки, поля или статуса — чтобы взгляд цеплялся за него в тексте. */
export function UI({ children }) {
    return (
        <span className='rounded border border-line bg-surface_muted px-1.5 py-0.5 text-[12px] font-medium text-neutral-800'>
            {children}
        </span>
    )
}

/** Клавиша. */
export function Kbd({ children }) {
    return (
        <kbd className='rounded border border-line bg-surface_muted px-1.5 py-0.5 font-mono text-[11px] text-neutral-600'>
            {children}
        </kbd>
    )
}

/** Компактная таблица «значение → что означает» (статусы, колонки отчёта). */
export function DefTable({ head = ["Значение", "Что означает"], rows }) {
    return (
        <div className='overflow-x-auto'>
            <table className='w-full min-w-[520px] border-collapse text-[13px]'>
                <thead>
                    <tr className='border-b border-line text-left text-[11px] uppercase tracking-wider text-neutral-400'>
                        <th className='py-2 pr-4 font-medium'>{head[0]}</th>
                        <th className='py-2 font-medium'>{head[1]}</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map(([term, desc], i) => (
                        <tr key={i} className='border-b border-line/60 last:border-0'>
                            <td className='py-2 pr-4 align-top font-medium text-neutral-900'>
                                {term}
                            </td>
                            <td className='py-2 align-top text-neutral-600'>{desc}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
