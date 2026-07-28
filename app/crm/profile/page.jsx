import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/configs/auth"
import prisma from "@/lib/client"
import { PROFILE_SELECT } from "@/lib/crm/profile"
import ProfileForm from "@/components/crm/ProfileForm"
import { PageHeader } from "@/components/crm/ui"

export const metadata = { title: "Мой профиль | CRM" }

export default async function ProfilePage() {
    const session = await getServerSession(authOptions)
    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: PROFILE_SELECT,
    })
    // Запись могли удалить, пока жила кука сессии.
    if (!user) redirect("/authorize?callbackUrl=/crm/profile")

    return (
        <div className='space-y-5'>
            <PageHeader
                title='Мой профиль'
                subtitle='Ваши контактные данные и личные настройки.'
            />
            <ProfileForm initial={user} />
        </div>
    )
}
