import Link from "next/link"
import { notFound } from "next/navigation"
import { getServerSession } from "next-auth"
import { LuPencil, LuWarehouse } from "react-icons/lu"
import { authOptions } from "@/configs/auth"
import prisma from "@/lib/client"
import { formatMoney } from "@/lib/crm/format"
import { contentLines } from "@/lib/crm/product"
import { totalStockPieces } from "@/lib/crm/stock"
import CrmBackLink from "@/components/crm/CrmBackLink"
import LocalDateTime from "@/components/crm/LocalDateTime"

export const metadata = { title: "Товар | CRM" }

export default async function ProductPage({ params }) {
    const item = await prisma.product.findUnique({
        where: { id: params.id },
        include: {
            stocks: {
                orderBy: { warehouse: "asc" },
            },
        },
    })
    if (!item) notFound()

    const session = await getServerSession(authOptions)
    const canManage = session?.user?.role === "ADMIN"

    const lines = contentLines(item.contents)
    const totalPieces = totalStockPieces(item.stocks)
    const lastSync = item.stocks.length
        ? new Date(
              Math.max(...item.stocks.map(s => new Date(s.syncedAt).getTime())),
          )
        : null

    return (
        <div className='space-y-5'>
            <CrmBackLink
                fallback='/crm/products'
                fallbackLabel='Товары'
                className='inline-flex items-center gap-1 text-xs text-neutral-400 hover:text-brand_main'
            />

            <div className='flex flex-wrap items-start justify-between gap-3'>
                <div className='min-w-0'>
                    <p className='text-xs uppercase tracking-wider text-neutral-400'>
                        Артикул {item.sku}
                    </p>
                    <h1 className='mt-0.5 text-2xl font-semibold text-neutral-900 sm:text-3xl'>
                        {item.category}
                    </h1>
                    {item.name && item.name !== item.category && (
                        <p className='mt-1 text-sm text-neutral-500'>{item.name}</p>
                    )}
                </div>
                {canManage && (
                    <Link
                        href={`/crm/products/${item.id}/edit`}
                        className='inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-medium text-neutral-900/75 hover:bg-surface_muted'
                    >
                        <LuPencil className='h-3.5 w-3.5' />
                        Редактировать
                    </Link>
                )}
            </div>

            <div className='grid items-start gap-5 lg:grid-cols-2'>
                <section className='rounded-xl border border-line bg-white p-4 sm:p-5'>
                    <h2 className='mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500'>
                        Цены и упаковка
                    </h2>
                    <dl className='grid gap-3 sm:grid-cols-2'>
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

                <section className='rounded-xl border border-line bg-white p-4 sm:p-5'>
                    <div className='mb-3 flex items-center justify-between gap-2'>
                        <h2 className='flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-neutral-500'>
                            <LuWarehouse className='h-4 w-4 text-brand_main' />
                            Остатки на складах
                        </h2>
                        {lastSync && (
                            <span className='text-[10px] text-neutral-400'>
                                Обновлено <LocalDateTime value={lastSync} />
                            </span>
                        )}
                    </div>

                    {item.stocks.length === 0 ? (
                        <p className='text-sm text-neutral-400'>
                            Остатков нет. Нажмите «Обновить остатки» в списке товаров,
                            чтобы подтянуть данные из 1С.
                        </p>
                    ) : (
                        <>
                            <div className='overflow-x-auto rounded-lg border border-line'>
                                <table className='w-full text-sm'>
                                    <thead className='bg-surface_muted text-left text-xs uppercase tracking-wider text-neutral-500'>
                                        <tr>
                                            <th className='px-3 py-2'>Склад</th>
                                            <th className='px-3 py-2 text-right'>Шт.</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {item.stocks.map(s => (
                                            <tr
                                                key={s.id}
                                                className='border-t border-line'
                                            >
                                                <td className='px-3 py-2 text-neutral-700'>
                                                    {s.warehouse}
                                                </td>
                                                <td className='px-3 py-2 text-right font-medium text-neutral-900'>
                                                    {s.quantity.toLocaleString("ru-RU")}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className='border-t-2 border-brand_main/30 bg-surface_muted'>
                                            <td className='px-3 py-2 text-sm font-semibold uppercase text-neutral-500'>
                                                Итого
                                            </td>
                                            <td className='px-3 py-2 text-right text-base font-semibold text-neutral-900'>
                                                {totalPieces.toLocaleString("ru-RU")} шт.
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </>
                    )}
                </section>
            </div>

            <section className='rounded-xl border border-line bg-white p-4 sm:p-5'>
                <h2 className='mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500'>
                    Состав набора
                </h2>
                {lines.length === 0 ? (
                    <p className='text-sm text-neutral-400'>Состав не указан.</p>
                ) : (
                    <ul className='list-disc space-y-1 pl-5 text-sm text-neutral-700'>
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
            <dt className='text-[10px] uppercase tracking-wider text-neutral-400'>
                {label}
            </dt>
            <dd className='mt-0.5 text-sm text-neutral-900'>{value || "—"}</dd>
        </div>
    )
}
