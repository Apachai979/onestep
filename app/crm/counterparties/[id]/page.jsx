import Link from "next/link"
import { notFound } from "next/navigation"
import prisma from "@/lib/client"
import { COUNTERPARTY_TYPE_LABELS } from "@/lib/crm/counterparty"

export const metadata = { title: "Контрагент | CRM" }

export default async function CounterpartyPage({ params }) {
    const item = await prisma.counterparty.findUnique({
        where: { id: params.id },
        include: {
            createdBy: { select: { firstName: true, lastName: true, email: true } },
        },
    })
    if (!item) notFound()

    const backHref = item.type === "DISTRIBUTOR" ? "/crm/distributors" : "/crm/customers"
    const backLabel =
        item.type === "DISTRIBUTOR" ? "Дистрибьюторы" : "Конечные потребители"

    const createdByName = item.createdBy
        ? `${item.createdBy.firstName ?? ""} ${item.createdBy.lastName ?? ""}`.trim() ||
          item.createdBy.email
        : "—"

    return (
        <div className='max-w-3xl space-y-6'>
            <div className='text-sm'>
                <Link href={backHref} className='text-gray-500 hover:text-primary_green'>
                    ← {backLabel}
                </Link>
            </div>
            <div className='flex items-start justify-between gap-4'>
                <div>
                    <p className='text-xs uppercase text-gray-500'>
                        {COUNTERPARTY_TYPE_LABELS[item.type]}
                    </p>
                    <h1 className='mt-1 text-2xl font-semibold text-night_green'>{item.name}</h1>
                </div>
                <Link
                    href={`/crm/counterparties/${item.id}/edit`}
                    className='rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100'
                >
                    Редактировать
                </Link>
            </div>

            <dl className='grid gap-4 rounded-xl border border-gray-200 bg-white p-6 sm:grid-cols-2'>
                <Row label='Регион' value={item.region} />
                <Row label='ИНН' value={item.inn} />
                <Row label='Контактное лицо' value={item.contactPerson} />
                <Row label='Телефон' value={item.phone} />
                <Row label='Email' value={item.email} />
                <Row label='Адрес' value={item.address} />
                <Row label='Создал' value={createdByName} />
                <Row
                    label='Создан'
                    value={new Date(item.createdAt).toLocaleString("ru-RU")}
                />
                {item.note && (
                    <div className='sm:col-span-2'>
                        <dt className='text-xs uppercase text-gray-500'>Примечание</dt>
                        <dd className='mt-1 whitespace-pre-wrap text-sm text-gray-800'>
                            {item.note}
                        </dd>
                    </div>
                )}
            </dl>
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
