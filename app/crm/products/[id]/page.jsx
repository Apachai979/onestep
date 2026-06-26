import Link from "next/link"
import { notFound } from "next/navigation"
import prisma from "@/lib/client"
import { formatMoney } from "@/lib/crm/format"
import { contentLines } from "@/lib/crm/product"

export const metadata = { title: "Товар | CRM" }

export default async function ProductPage({ params }) {
    const item = await prisma.product.findUnique({ where: { id: params.id } })
    if (!item) notFound()

    const lines = contentLines(item.contents)

    return (
        <div className='max-w-3xl space-y-6'>
            <div className='text-sm'>
                <Link href='/crm/products' className='text-gray-500 hover:text-primary_green'>
                    ← Товары
                </Link>
            </div>

            <div className='flex flex-wrap items-start justify-between gap-4'>
                <div>
                    <p className='text-xs uppercase text-gray-500'>Артикул {item.sku}</p>
                    <h1 className='mt-1 text-2xl font-semibold text-night_green'>
                        {item.category}
                    </h1>
                    {item.name && item.name !== item.category && (
                        <p className='mt-1 text-sm text-gray-600'>{item.name}</p>
                    )}
                </div>
                <Link
                    href={`/crm/products/${item.id}/edit`}
                    className='rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100'
                >
                    Редактировать
                </Link>
            </div>

            <section className='rounded-xl border border-gray-200 bg-white p-5'>
                <h2 className='mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500'>
                    Цены и упаковка
                </h2>
                <dl className='grid gap-4 sm:grid-cols-2'>
                    <Row label='Базовая цена' value={formatMoney(item.basePrice)} />
                    <Row label='Цена упаковки' value={formatMoney(item.packagePrice)} />
                    <Row label='В транспортной упаковке, шт.' value={item.transportPackQty} />
                    <Row
                        label='Рекомендованная цена ЛПУ'
                        value={item.recommendedLpuPrice ? formatMoney(item.recommendedLpuPrice) : "—"}
                    />
                    <Row
                        label='Вес единицы, кг'
                        value={item.unitWeightKg ? item.unitWeightKg.toString() : "—"}
                    />
                    <Row
                        label='Объём единицы, м³'
                        value={item.unitVolumeM3 ? item.unitVolumeM3.toString() : "—"}
                    />
                </dl>
            </section>

            <section className='rounded-xl border border-gray-200 bg-white p-5'>
                <h2 className='mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500'>
                    Состав набора
                </h2>
                {lines.length === 0 ? (
                    <p className='text-sm text-gray-400'>Состав не указан.</p>
                ) : (
                    <ul className='list-disc space-y-1 pl-5 text-sm text-gray-800'>
                        {lines.map((line, i) => (
                            <li key={i}>{line}</li>
                        ))}
                    </ul>
                )}
            </section>
        </div>
    )
}

function Row({ label, value }) {
    return (
        <div>
            <dt className='text-xs uppercase text-gray-500'>{label}</dt>
            <dd className='mt-1 text-sm text-gray-800'>{value || "—"}</dd>
        </div>
    )
}
