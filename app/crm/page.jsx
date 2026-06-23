import Link from "next/link"
import { getServerSession } from "next-auth"
import { authOptions } from "@/configs/auth"

export default async function CrmHome() {
    const session = await getServerSession(authOptions)
    const role = session?.user?.role

    return (
        <div className='space-y-6'>
            <div>
                <h1 className='text-3xl font-semibold text-night_green'>
                    Добро пожаловать, {session?.user?.name}
                </h1>
                <p className='mt-2 text-gray-600'>
                    Внутренний раздел отдела продаж. Здесь будет управление дистрибьюторами,
                    конечными потребителями и аукционными проектами.
                </p>
            </div>

            <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
                <CrmCard
                    title='Проекты (аукционы)'
                    description='Список действующих и завершённых проектов, связки дистрибьютор — конечный потребитель.'
                    href='/crm/projects'
                />
                <CrmCard
                    title='Дистрибьюторы'
                    description='Справочник партнёров-посредников по регионам.'
                    href='/crm/distributors'
                />
                <CrmCard
                    title='Конечные потребители'
                    description='Справочник лечебных учреждений.'
                    href='/crm/customers'
                />
                {role === "ADMIN" && (
                    <CrmCard
                        title='Пользователи'
                        description='Управление сотрудниками и приглашениями.'
                        href='/crm/users'
                    />
                )}
            </div>

            <div className='rounded-xl border border-dashed border-gray-300 bg-white p-6 text-sm text-gray-500'>
                Разделы находятся в разработке. На текущем этапе подключена авторизация и закрытая
                зона. Дальше — справочники и проекты.
            </div>
        </div>
    )
}

function CrmCard({ title, description, href }) {
    return (
        <Link
            href={href}
            className='block rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-primary_green hover:shadow-md'
        >
            <h2 className='text-lg font-semibold text-night_green'>{title}</h2>
            <p className='mt-2 text-sm text-gray-600'>{description}</p>
        </Link>
    )
}
