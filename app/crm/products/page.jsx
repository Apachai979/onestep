import ProductsList from "@/components/crm/ProductsList"

export const metadata = { title: "Товары | CRM" }

export default function ProductsPage() {
    return (
        <div className='space-y-4'>
            <h1 className='text-2xl font-semibold text-night_green'>Товары</h1>
            <ProductsList />
        </div>
    )
}
