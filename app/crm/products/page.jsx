import { getServerSession } from "next-auth"
import { authOptions } from "@/configs/auth"
import ProductsList from "@/components/crm/ProductsList"
import { PageHeader } from "@/components/crm/ui"

export const metadata = { title: "Товары | CRM" }

export default async function ProductsPage() {
    const session = await getServerSession(authOptions)
    const canManage = session?.user?.role === "ADMIN"

    return (
        <div className='space-y-5'>
            <PageHeader
                title='Товары'
                subtitle='Справочник наборов NeoSet: артикулы, цены, состав, упаковка.'
            />
            <ProductsList canManage={canManage} />
        </div>
    )
}
