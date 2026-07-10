import ProductForm from "@/components/crm/ProductForm"
import CrmBackLink from "@/components/crm/CrmBackLink"

export const metadata = { title: "Новый товар | CRM" }

export default function NewProductPage() {
    return (
        <div className='max-w-3xl space-y-4'>
            <CrmBackLink
                fallback='/crm/products'
                fallbackLabel='Товары'
                className='inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-brand_main'
            />
            <h1 className='text-2xl font-semibold text-neutral-900'>Новый товар</h1>
            <ProductForm mode='create' />
        </div>
    )
}
