import { notFound, redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/configs/auth"
import prisma from "@/lib/client"
import AdminUserForm from "@/components/crm/AdminUserForm"
import CrmBackLink from "@/components/crm/CrmBackLink"

export const metadata = { title: "Редактирование сотрудника | CRM" }

export default async function EditUserPage({ params }) {
    const session = await getServerSession(authOptions)
    if (session?.user?.role !== "ADMIN") {
        redirect("/crm")
    }

    const item = await prisma.user.findUnique({
        where: { id: params.id },
        select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            position: true,
            role: true,
            status: true,
        },
    })
    if (!item) notFound()

    const initial = { ...item }
    const isSelf = session.user.id === item.id

    return (
        <div className='max-w-3xl space-y-4'>
            <CrmBackLink
                fallback='/crm/users'
                fallbackLabel='Пользователи'
                className='inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-brand_main'
            />
            <h1 className='text-2xl font-semibold text-neutral-900'>
                Редактирование сотрудника
            </h1>
            <p className='text-sm text-neutral-500'>{initial.email}</p>
            <AdminUserForm initial={initial} isSelf={isSelf} />
        </div>
    )
}
