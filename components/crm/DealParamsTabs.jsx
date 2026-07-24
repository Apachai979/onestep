"use client"
import { useState } from "react"

// Карточка параметров сделки-аукциона с двумя вкладками: «Параметры сделки»
// и «Параметры аукциона». Контент вкладок приходит уже отрендеренным с сервера
// (передаётся как React-узлы), клиент лишь переключает активную.
export default function DealParamsTabs({ tabs, action }) {
    const [active, setActive] = useState(0)

    return (
        <section className='flex flex-col rounded-xl border border-line bg-white p-4'>
            <div className='mb-3 flex items-center justify-between gap-3'>
                <div className='flex gap-1 rounded-lg bg-surface_muted p-0.5'>
                    {tabs.map((t, i) => (
                        <button
                            key={i}
                            type='button'
                            onClick={() => setActive(i)}
                            className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                                active === i
                                    ? "bg-white text-neutral-900 shadow-sm"
                                    : "text-neutral-500 hover:text-neutral-800"
                            }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
                {action && <div className='shrink-0'>{action}</div>}
            </div>
            {tabs[active]?.content}
        </section>
    )
}
