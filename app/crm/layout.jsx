import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import Link from "next/link"
import { authOptions } from "@/configs/auth"
import SignOutButton from "@/components/crm/SignOutButton"
import TasksNavLink from "@/components/crm/TasksNavLink"

export const metadata = {
    title: "CRM",
}

export default async function CrmLayout({ children }) {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
        redirect("/authorize?callbackUrl=/crm")
    }
    const role = session.user.role
    if (role !== "MANAGER" && role !== "ADMIN") {
        redirect("/")
    }

    return (
        <div className='min-h-[calc(100vh-64px)] bg-body_bg'>
            <div className='border-b border-gray-200 bg-white'>
                <div className='container mx-auto flex max-w-[1400px] items-center justify-between px-4 py-3'>
                    <nav className='flex items-center gap-6 text-sm'>
                        <Link href='/crm' className='font-semibold text-night_green'>
                            CRM
                        </Link>
                        <span className='text-gray-300'>|</span>
                        <TasksNavLink />
                        <Link
                            href='/crm/deals'
                            className='text-gray-600 hover:text-primary_green'
                        >
                            Сделки
                        </Link>
                        <Link
                            href='/crm/shipments'
                            className='text-gray-600 hover:text-primary_green'
                        >
                            Отгрузки
                        </Link>
                        <Link
                            href='/crm/projects'
                            className='text-gray-600 hover:text-primary_green'
                        >
                            Проекты
                        </Link>
                        <Link
                            href='/crm/distributors'
                            className='text-gray-600 hover:text-primary_green'
                        >
                            Дистрибьюторы
                        </Link>
                        <Link
                            href='/crm/customers'
                            className='text-gray-600 hover:text-primary_green'
                        >
                            Конечные потребители
                        </Link>
                        <Link
                            href='/crm/products'
                            className='text-gray-600 hover:text-primary_green'
                        >
                            Товары
                        </Link>
                        {role === "ADMIN" && (
                            <Link
                                href='/crm/users'
                                className='text-gray-600 hover:text-primary_green'
                            >
                                Пользователи
                            </Link>
                        )}
                    </nav>
                    <div className='flex items-center gap-3 text-sm'>
                        <span className='text-gray-700'>{session.user.name}</span>
                        <span className='rounded-full bg-light_green/30 px-2 py-0.5 text-xs font-medium text-night_green'>
                            {role === "ADMIN" ? "Администратор" : "Менеджер"}
                        </span>
                        <SignOutButton />
                    </div>
                </div>
            </div>
            <main className='container mx-auto max-w-[1400px] px-4 py-6'>{children}</main>
        </div>
    )
}
