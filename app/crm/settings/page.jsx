import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/configs/auth"
import { PROPOSAL_EMAIL_PLACEHOLDERS, TASK_EMAIL_PLACEHOLDERS } from "@/lib/crm/settings"
import EmailTemplateSettings from "@/components/crm/EmailTemplateSettings"
import ImportExportSettings from "@/components/crm/ImportExportSettings"
import { PageHeader } from "@/components/crm/ui"

export const metadata = { title: "Настройки | CRM" }

export default async function SettingsPage() {
    const session = await getServerSession(authOptions)
    if (session?.user?.role !== "ADMIN") redirect("/crm")

    return (
        <div className='space-y-5'>
            <PageHeader
                title='Настройки'
                subtitle='Шаблоны и параметры CRM. Доступно только администратору.'
            />
            <ImportExportSettings />
            <EmailTemplateSettings
                endpoint='/api/crm/settings/proposal-email'
                title='Шаблон письма с КП'
                description='Используется при отправке коммерческого предложения клиенту со страницы «Сформировать КП». Менеджер видит текст перед отправкой и может подправить его под конкретного клиента.'
                placeholders={PROPOSAL_EMAIL_PLACEHOLDERS}
            />
            <EmailTemplateSettings
                endpoint='/api/crm/settings/task-email'
                title='Шаблон письма о новой задаче'
                description='Уходит автоматически исполнителю, когда ему поставили задачу или передали её. Задачи, поставленные самому себе, не уведомляются; каждый сотрудник может отключить эти письма в своём профиле.'
                placeholders={TASK_EMAIL_PLACEHOLDERS}
            />
        </div>
    )
}
