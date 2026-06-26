import ProductsList from "@/components/crm/ProductsList"
import { PageHeader } from "@/components/crm/ui"

export const metadata = { title: "Товары | CRM" }

export default function ProductsPage() {
    return (
        <div className='space-y-5'>
            <PageHeader
                title='Товары'
                subtitle='Справочник наборов NeoSet: артикулы, цены, состав, упаковка.'
            />
            <ProductsList />
        </div>
    )
}
