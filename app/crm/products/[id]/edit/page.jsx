import { notFound } from "next/navigation"
import prisma from "@/lib/client"
import ProductForm from "@/components/crm/ProductForm"
import CrmBackLink from "@/components/crm/CrmBackLink"

export const metadata = { title: "Редактирование товара | CRM" }

export default async function EditProductPage({ params }) {
    const item = await prisma.product.findUnique({ where: { id: params.id } })
    if (!item) notFound()

    const initial = {
        ...item,
        basePrice: item.basePrice.toString(),
        packagePrice: item.packagePrice.toString(),
        recommendedLpuPrice:
            item.recommendedLpuPrice === null ? "" : item.recommendedLpuPrice.toString(),
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
    }

    return (
        <div className='max-w-3xl space-y-4'>
            <CrmBackLink
                fallback={`/crm/products/${item.id}`}
                fallbackLabel={item.sku}
                className='inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary_green'
            />
            <h1 className='text-2xl font-semibold text-night_green'>Редактирование товара</h1>
            <ProductForm mode='edit' initial={initial} />
        </div>
    )
}
