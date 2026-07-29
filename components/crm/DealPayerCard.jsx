"use client"
import Link from "next/link"
import { useState } from "react"
import { LuCopy, LuCheck } from "react-icons/lu"

// Плательщик — юрлицо, на которое оформляют договор и счёт, когда клиент просит
// провести сделку через другую свою компанию. Документы делают вне CRM, поэтому
// реквизиты здесь необязательны: показываем то, что есть, чтобы не набирать
// вручную.
export default function DealPayerCard({ payer, clientName }) {
    const [copied, setCopied] = useState(false)

    const rows = [
        ["Наименование", payer.name],
        ["ИНН", payer.inn],
        ["КПП", payer.kpp],
        ["ОГРН", payer.ogrn],
        ["Юридический адрес", payer.address],
        ["Банк", payer.bankName],
        ["БИК", payer.bik],
        ["Расчётный счёт", payer.bankAccount],
        ["Корр. счёт", payer.bankCorrAccount],
    ]

    const filled = rows.filter(([, v]) => v)

    async function copy() {
        const text = filled.map(([k, v]) => `${k}: ${v}`).join("\n")
        try {
            await navigator.clipboard.writeText(text)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch {
            setCopied(false)
        }
    }

    return (
        <section className='rounded-xl border border-amber-200 bg-amber-50/40 p-4'>
            <div className='flex flex-wrap items-start justify-between gap-3'>
                <div className='min-w-0'>
                    <p className='text-[10px] font-medium uppercase tracking-wider text-amber-700'>
                        Плательщик · документы оформляются на него
                    </p>
                    <Link
                        href={`/crm/counterparties/${payer.id}`}
                        className='mt-1 block text-base font-semibold leading-snug text-neutral-900 hover:text-brand_main'
                    >
                        {payer.name}
                    </Link>
                    <p className='mt-1 text-xs text-neutral-500'>
                        Работаем с «{clientName}» — договор и счёт по просьбе клиента идут на
                        это юрлицо.
                    </p>
                </div>
                <button
                    type='button'
                    onClick={copy}
                    className='inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1.5 text-sm font-medium text-neutral-700 transition hover:bg-surface_muted'
                >
                    {copied ? (
                        <LuCheck className='h-3.5 w-3.5 text-emerald-600' />
                    ) : (
                        <LuCopy className='h-3.5 w-3.5' />
                    )}
                    {copied ? "Скопировано" : "Скопировать реквизиты"}
                </button>
            </div>

            {filled.length <= 1 ? (
                <p className='mt-3 text-sm text-neutral-500'>
                    Реквизиты не заполнены — при необходимости их можно внести в{" "}
                    <Link
                        href={`/crm/counterparties/${payer.id}/edit`}
                        className='text-brand_main hover:underline'
                    >
                        карточке юрлица
                    </Link>
                    .
                </p>
            ) : (
                <dl className='mt-3 grid gap-x-4 gap-y-2.5 sm:grid-cols-2 lg:grid-cols-3'>
                    {filled.map(([label, value]) => (
                        <div key={label}>
                            <dt className='text-[10px] uppercase tracking-wider text-neutral-400'>
                                {label}
                            </dt>
                            <dd className='mt-0.5 break-all text-sm text-neutral-900'>
                                {value}
                            </dd>
                        </div>
                    ))}
                </dl>
            )}
        </section>
    )
}
