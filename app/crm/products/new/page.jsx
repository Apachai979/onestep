import Link from "next/link"
import ProductForm from "@/components/crm/ProductForm"

export const metadata = { title: "Новый товар | CRM" }

export default function NewProductPage() {
    return (
        <div className='max-w-3xl space-y-4'>
            <div className='text-sm'>
                <Link href='/crm/products' className='text-gray-500 hover:text-primary_green'>
                    ← Товары
                </Link>
            </div>
            <h1 className='text-2xl font-semibold text-night_green'>Новый товар</h1>
            <ProductForm mode='create' />
        </div>
    )
}
