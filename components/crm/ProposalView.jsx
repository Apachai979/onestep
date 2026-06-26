"use client"
import Image from "next/image"
import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { rublesToWords } from "@/lib/crm/number-to-words"

const SELLER = {
    name: 'ООО «OneStep»',
    address: "634015, Томская область, г. Томск, ул. Циолковского, 19/1, пом. 24",
    phones: "+7 (495) 231-01-11 · +7 (985) 231-01-11",
    email: "info@onestep.su",
    site: "www.onestep.su",
}

function todayStr() {
    const d = new Date()
    const dd = String(d.getDate()).padStart(2, "0")
    const mm = String(d.getMonth() + 1).padStart(2, "0")
    return `${dd}.${mm}.${d.getFullYear()}`
}

function todayInput() {
    const d = new Date()
    const dd = String(d.getDate()).padStart(2, "0")
    const mm = String(d.getMonth() + 1).padStart(2, "0")
    return `${d.getFullYear()}-${mm}-${dd}`
}

function fmtInputDate(d) {
    if (!d) return todayStr()
    const dt = new Date(d)
    if (Number.isNaN(dt.getTime())) return todayStr()
    const dd = String(dt.getDate()).padStart(2, "0")
    const mm = String(dt.getMonth() + 1).padStart(2, "0")
    return `${dd}.${mm}.${dt.getFullYear()}`
}

function fmtQty(n) {
    const v = Math.round(Number(n) * 1000) / 1000
    return v.toLocaleString("ru-RU", { maximumFractionDigits: 3 })
}

function fmtMoneyPlain(n) {
    const v = Number(n) || 0
    return v.toLocaleString("ru-RU", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })
}

function fmtAuto(n, digits) {
    const v = Math.round((Number(n) || 0) * 10 ** digits) / 10 ** digits
    return v.toLocaleString("ru-RU", { maximumFractionDigits: digits })
}

export default function ProposalView({
    dealId,
    buyer,
    items,
    subtotal,
    defaultDiscount,
    defaultWeight,
    defaultVolume,
    senderName,
    senderPhone,
    senderEmail,
}) {
    const [form, setForm] = useState({
        number: `${dealId.slice(-4).toUpperCase()}/1`,
        date: todayInput(),
        validDays: 60,
        buyer,
        deliveryTerm: "90 дней с момента оплаты",
        paymentTerm: "100%",
        deliveryCondition: "самовывоз, отгрузка производится кратно транспортным упаковкам",
        intro: `Компания ${SELLER.name} предлагает вашему вниманию коммерческое предложение на поставку следующей продукции:`,
        discount: defaultDiscount || 0,
        vatRate: 10,
        volume: defaultVolume > 0 ? fmtAuto(defaultVolume, 3) : "",
        weight: defaultWeight > 0 ? fmtAuto(defaultWeight, 1) : "",
        senderName: senderName || "",
        senderPhone: senderPhone || "",
        senderEmail: senderEmail || "",
    })

    function update(field) {
        return e => setForm(prev => ({ ...prev, [field]: e.target.value }))
    }

    const totals = useMemo(() => {
        const sub = Number(subtotal) || 0
        const discountPct = Math.max(0, Math.min(100, Number(form.discount) || 0))
        const discountAmount = (sub * discountPct) / 100
        const finalAmount = sub - discountAmount
        const vatRate = Math.max(0, Math.min(100, Number(form.vatRate) || 0))
        const vatAmount = vatRate > 0 ? (finalAmount * vatRate) / (100 + vatRate) : 0
        return {
            sub,
            discountPct,
            discountAmount,
            finalAmount,
            vatRate,
            vatAmount,
            words: rublesToWords(finalAmount),
        }
    }, [subtotal, form.discount, form.vatRate])

    const fileNameRef = useRef("")
    fileNameRef.current = `Коммерческое предложение № ${form.number} от ${fmtInputDate(form.date)}`

    useEffect(() => {
        if (typeof window === "undefined") return
        let prevTitle = ""
        function before() {
            prevTitle = document.title
            document.title = fileNameRef.current || " "
        }
        function after() {
            if (prevTitle) document.title = prevTitle
        }
        window.addEventListener("beforeprint", before)
        window.addEventListener("afterprint", after)
        return () => {
            window.removeEventListener("beforeprint", before)
            window.removeEventListener("afterprint", after)
        }
    }, [])

    function handlePrint() {
        if (typeof window !== "undefined") window.print()
    }

    return (
        <div className='space-y-6 print:space-y-0'>
            <div className='flex items-center justify-between gap-3 print:hidden'>
                <Link
                    href={`/crm/deals/${dealId}`}
                    className='text-sm text-gray-500 hover:text-primary_green'
                >
                    ← К сделке
                </Link>
                <button
                    type='button'
                    onClick={handlePrint}
                    className='rounded-lg bg-primary_green px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-contrast_green'
                    title='В открывшемся диалоге выберите принтер «Сохранить как PDF»'
                >
                    Сохранить в PDF
                </button>
            </div>

            <section className='space-y-4 rounded-xl border border-gray-200 bg-white p-5 print:hidden'>
                <h2 className='text-sm font-semibold uppercase tracking-wide text-gray-500'>
                    Параметры КП
                </h2>
                <div className='grid gap-3 sm:grid-cols-3'>
                    <Field label='Номер КП'>
                        <Input value={form.number} onChange={update("number")} />
                    </Field>
                    <Field label='Дата'>
                        <Input type='date' value={form.date} onChange={update("date")} />
                    </Field>
                    <Field label='Действительно, рабочих дней'>
                        <Input
                            type='number'
                            min='1'
                            value={form.validDays}
                            onChange={update("validDays")}
                        />
                    </Field>
                </div>
                <Field label='Покупатель'>
                    <Input value={form.buyer} onChange={update("buyer")} />
                </Field>
                <div className='grid gap-3 sm:grid-cols-3'>
                    <Field label='Срок поставки'>
                        <Input
                            value={form.deliveryTerm}
                            onChange={update("deliveryTerm")}
                        />
                    </Field>
                    <Field label='Условия оплаты'>
                        <Input value={form.paymentTerm} onChange={update("paymentTerm")} />
                    </Field>
                    <Field label='Условия поставки'>
                        <Input
                            value={form.deliveryCondition}
                            onChange={update("deliveryCondition")}
                        />
                    </Field>
                </div>
                <Field label='Вступительная строка'>
                    <textarea
                        rows={2}
                        value={form.intro}
                        onChange={update("intro")}
                        className='w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary_green focus:outline-none'
                    />
                </Field>
                <div className='grid gap-3 sm:grid-cols-4'>
                    <Field label='Скидка, %'>
                        <Input
                            type='number'
                            min='0'
                            max='100'
                            step='0.01'
                            value={form.discount}
                            onChange={update("discount")}
                        />
                    </Field>
                    <Field label='Ставка НДС, %'>
                        <Input
                            type='number'
                            min='0'
                            max='100'
                            step='0.01'
                            value={form.vatRate}
                            onChange={update("vatRate")}
                        />
                    </Field>
                    <Field label='Объём груза, м³ (авто)'>
                        <Input
                            value={form.volume}
                            onChange={update("volume")}
                            placeholder='считается из позиций'
                        />
                    </Field>
                    <Field label='Вес груза, кг (авто)'>
                        <Input
                            value={form.weight}
                            onChange={update("weight")}
                            placeholder='считается из позиций'
                        />
                    </Field>
                </div>
                <div className='grid gap-3 sm:grid-cols-3'>
                    <Field label='Подписант — имя'>
                        <Input
                            value={form.senderName}
                            onChange={update("senderName")}
                        />
                    </Field>
                    <Field label='Телефон'>
                        <Input
                            value={form.senderPhone}
                            onChange={update("senderPhone")}
                        />
                    </Field>
                    <Field label='Email'>
                        <Input
                            value={form.senderEmail}
                            onChange={update("senderEmail")}
                        />
                    </Field>
                </div>
            </section>

            <article className='proposal mx-auto max-w-[210mm] bg-white px-10 py-8 text-[10.5pt] leading-snug text-black shadow-sm print:max-w-none print:p-0 print:shadow-none'>
                <header className='flex items-start justify-between gap-6 border-b border-black/10 pb-4'>
                    <div className='shrink-0'>
                        <Image
                            src='/logo_name.svg'
                            alt='OneStep'
                            width={160}
                            height={48}
                            priority
                        />
                    </div>
                    <div className='text-right text-[9pt] text-black/80'>
                        <p>{SELLER.address}</p>
                        <p>{SELLER.phones}</p>
                        <p>{SELLER.email}</p>
                        <p>{SELLER.site}</p>
                    </div>
                </header>

                <div className='mt-6 text-center'>
                    <h1 className='text-base font-semibold'>
                        Коммерческое предложение № {form.number} от {fmtInputDate(form.date)}
                    </h1>
                    <p className='mt-0.5 text-[9.5pt] italic text-black/70'>
                        действительно {form.validDays} рабочих дней
                    </p>
                </div>

                <dl className='mt-5 space-y-1 text-[10.5pt]'>
                    <ParamRow label='Покупатель' value={form.buyer} />
                    <ParamRow label='Срок поставки' value={form.deliveryTerm} />
                    <ParamRow label='Условия оплаты' value={form.paymentTerm} />
                    <ParamRow label='Условия поставки' value={form.deliveryCondition} />
                </dl>

                <p className='mt-4'>{form.intro}</p>

                <table className='mt-3 w-full border-collapse text-[9pt]'>
                    <thead>
                        <tr className='bg-black/5'>
                            <Th className='w-[3%]'>№</Th>
                            <Th className='w-[12%]'>Артикул</Th>
                            <Th>Наименование товара</Th>
                            <Th className='w-[7%]'>Кол-во шт.</Th>
                            <Th className='w-[8%]'>Цена за шт.</Th>
                            <Th className='w-[7%]'>Кол-во шт. в тр. уп.</Th>
                            <Th className='w-[8%]'>Цена за уп.</Th>
                            <Th className='w-[7%]'>Кол-во тр. упаковок</Th>
                            <Th className='w-[11%]'>Сумма, руб.</Th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map(it => (
                            <tr key={it.n} className='align-top'>
                                <Td className='text-center'>{it.n}</Td>
                                <Td>{it.sku || "—"}</Td>
                                <Td>
                                    <p className='font-medium'>{it.name}</p>
                                    {it.contents && (
                                        <p className='mt-1 whitespace-pre-wrap text-[8.5pt] text-black/75'>
                                            {it.contents}
                                        </p>
                                    )}
                                </Td>
                                <Td className='text-right'>{fmtQty(it.qty)}</Td>
                                <Td className='text-right'>{fmtMoneyPlain(it.unitPrice)}</Td>
                                <Td className='text-right'>
                                    {it.packQty ? fmtQty(it.packQty) : "—"}
                                </Td>
                                <Td className='text-right'>
                                    {it.packPrice !== null ? fmtMoneyPlain(it.packPrice) : "—"}
                                </Td>
                                <Td className='text-right'>
                                    {it.packs !== null
                                        ? Number.isInteger(it.packs)
                                            ? it.packs
                                            : fmtQty(it.packs)
                                        : "—"}
                                </Td>
                                <Td className='text-right'>{fmtMoneyPlain(it.amount)}</Td>
                            </tr>
                        ))}
                        {items.length === 0 && (
                            <tr>
                                <Td colSpan={9} className='text-center text-black/50'>
                                    В сделке нет товарных позиций
                                </Td>
                            </tr>
                        )}
                    </tbody>
                </table>

                <div className='mt-3 flex justify-end'>
                    <table className='border-collapse text-[9.5pt]'>
                        <tbody>
                            <TotalsRow label='ИТОГО:' value={fmtMoneyPlain(totals.sub)} />
                            {totals.discountPct > 0 && (
                                <>
                                    <TotalsRow
                                        label='Скидка:'
                                        value={`${totals.discountPct}%`}
                                    />
                                    <TotalsRow
                                        label='Сумма скидки:'
                                        value={fmtMoneyPlain(totals.discountAmount)}
                                    />
                                    <TotalsRow
                                        label='Итого со скидкой:'
                                        value={fmtMoneyPlain(totals.finalAmount)}
                                    />
                                </>
                            )}
                            {totals.vatRate > 0 && (
                                <TotalsRow
                                    label={`В т.ч. НДС ${totals.vatRate}%:`}
                                    value={fmtMoneyPlain(totals.vatAmount)}
                                />
                            )}
                        </tbody>
                    </table>
                </div>

                <p className='mt-4 font-semibold'>
                    Итого: {fmtMoneyPlain(totals.finalAmount)}
                </p>
                <p className='italic text-black/85'>{totals.words}</p>

                {(form.volume || form.weight) && (
                    <div className='mt-3 text-right text-[9pt] italic text-black/70'>
                        {form.volume && <p>Объём груза, м³: {form.volume}</p>}
                        {form.weight && <p>Вес груза, кг: {form.weight}</p>}
                    </div>
                )}

                <p className='mt-5 text-[8.5pt] text-black/70'>
                    Настоящее коммерческое предложение не является офертой (в соответствии со
                    ст. 435 ГК РФ). {SELLER.name} оставляет за собой право не заключать договор,
                    либо заключить договор на иных условиях, отличных от предложенных.
                </p>

                <div className='mt-6 text-[9.5pt]'>
                    <p>С уважением,</p>
                    <p>{form.senderName || "—"}</p>
                    {form.senderPhone && <p>Тел. {form.senderPhone}</p>}
                    {form.senderEmail && <p>Email: {form.senderEmail}</p>}
                </div>
            </article>

            <style jsx global>{`
                .proposal table th,
                .proposal table td {
                    border: 1px solid rgba(0, 0, 0, 0.4);
                    padding: 4px 6px;
                }
                .proposal .totals-cell {
                    border: 1px solid rgba(0, 0, 0, 0.4);
                    padding: 3px 8px;
                }
                @media print {
                    @page {
                        size: A4;
                        margin: 0;
                    }
                    html,
                    body {
                        background: white !important;
                    }
                    body * {
                        visibility: hidden;
                    }
                    .proposal,
                    .proposal * {
                        visibility: visible;
                    }
                    .proposal {
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: 100%;
                        padding: 12mm !important;
                    }
                }
            `}</style>
        </div>
    )
}

function Field({ label, children }) {
    return (
        <div>
            <label className='mb-1 block text-xs text-gray-600'>{label}</label>
            {children}
        </div>
    )
}

function Input(props) {
    return (
        <input
            {...props}
            className='w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary_green focus:outline-none'
        />
    )
}

function ParamRow({ label, value }) {
    return (
        <div className='flex gap-2'>
            <dt className='shrink-0 text-black/70'>{label}:</dt>
            <dd className='font-medium'>{value || "—"}</dd>
        </div>
    )
}

function Th({ children, className = "" }) {
    return (
        <th className={`text-center font-semibold ${className}`}>{children}</th>
    )
}

function Td({ children, className = "", ...rest }) {
    return (
        <td className={className} {...rest}>
            {children}
        </td>
    )
}

function TotalsRow({ label, value }) {
    return (
        <tr>
            <td className='totals-cell text-right font-semibold'>{label}</td>
            <td className='totals-cell text-right' style={{ minWidth: 110 }}>
                {value}
            </td>
        </tr>
    )
}
