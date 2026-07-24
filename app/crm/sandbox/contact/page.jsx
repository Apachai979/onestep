import Link from "next/link"
import {
    LuPencil,
    LuBriefcase,
    LuFileText,
    LuActivity,
    LuMessageSquare,
} from "react-icons/lu"
import { Badge, Button, Card } from "@/components/crm/ui"

// ВРЕМЕННАЯ песочница: карточка «Контакт» в стиле утверждённого варианта 3.
// Данные замоканы. Удалить вместе с /crm/sandbox после переноса в бой.
export const metadata = { title: "Песочница · Карточка контакта | CRM" }

const C = {
    firstName: "Ольга",
    lastName: "Смирнова",
    middleName: "Викторовна",
    position: "Руководитель отдела закупок",
    company: "ООО «МедТорг Поволжье»",
    companyId: "demo",
    phone: "+7 (927) 555-12-34",
    workPhone: "+7 (846) 221-33-44 доб. 105",
    email: "o.smirnova@medtorg.ru",
    birthDate: "14.09.1985",
    isPrimary: true,
    comment: "Предпочитает общение по email. Решает по закупкам перевязочных материалов. День рождения — не забывать поздравлять.",
    createdBy: "Иванова Анна",
    createdAt: "05.04.2024",
}

export default function ContactSandboxPage() {
    const fullName = `${C.lastName} ${C.firstName} ${C.middleName}`.trim()
    const initials = `${C.lastName[0]}${C.firstName[0]}`

    return (
        <div className='space-y-4'>
            <div className='rounded-xl border border-dashed border-line_strong bg-surface_muted px-4 py-2.5 text-xs text-neutral-500'>
                Песочница · карточка «Контакт» в стиле варианта 3.{" "}
                <Link href='/crm/sandbox' className='font-medium text-brand_main hover:underline'>
                    ← к карточке дистрибьютора
                </Link>
            </div>

            {/* Верхний бар-шапка */}
            <div className='flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white px-4 py-3 shadow-sm'>
                <div className='min-w-0'>
                    <div className='flex flex-wrap items-center gap-2'>
                        <h1 className='text-base font-semibold tracking-tight text-neutral-900'>
                            {fullName}
                        </h1>
                        {C.isPrimary && (
                            <Badge tone='brand' size='sm'>Основной контакт</Badge>
                        )}
                    </div>
                    <p className='mt-0.5 text-xs text-neutral-500'>
                        {C.position} · {C.company}
                    </p>
                </div>
                <Button variant='secondary' size='sm'>
                    <LuPencil className='h-3.5 w-3.5' /> Изменить
                </Button>
            </div>

            <div className='grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(340px,1fr)]'>
                <div className='min-w-0 space-y-4'>
                    <Card padding='sm'>
                        <SectionTitle icon={LuFileText}>Контактные данные</SectionTitle>
                        <dl className='divide-y divide-line'>
                            <Row label='Телефон' value={C.phone} />
                            <Row label='Рабочий' value={C.workPhone} />
                            <Row label='Email' value={C.email} />
                            <Row label='Дата рождения' value={C.birthDate} />
                        </dl>
                    </Card>
                    <Card padding='sm'>
                        <SectionTitle icon={LuBriefcase}>Место работы</SectionTitle>
                        <dl className='divide-y divide-line'>
                            <Row
                                label='Компания'
                                value={
                                    <Link
                                        href={`/crm/counterparties/${C.companyId}`}
                                        className='text-brand_main hover:underline'
                                    >
                                        {C.company}
                                    </Link>
                                }
                            />
                            <Row label='Должность' value={C.position} />
                            <Row label='Роль' value={C.isPrimary ? "Основной контакт" : "—"} />
                        </dl>
                    </Card>

                    <Card padding='sm'>
                        <SectionTitle icon={LuMessageSquare}>Комментарий</SectionTitle>
                        <p className='whitespace-pre-wrap text-sm leading-relaxed text-neutral-600'>
                            {C.comment}
                        </p>
                        <p className='mt-3 border-t border-line pt-2 text-[11px] text-neutral-400'>
                            Создал {C.createdBy} · {C.createdAt}
                        </p>
                    </Card>
                </div>

                <Card padding='sm' className='lg:sticky lg:top-5 lg:self-start'>
                    <SectionTitle icon={LuActivity}>Активность и задачи</SectionTitle>
                    <div className='rounded-xl border border-dashed border-line p-4 text-center text-sm text-neutral-400'>
                        Здесь останется существующая панель активности (ActivityPanel).
                    </div>
                </Card>
            </div>
        </div>
    )
}

function SectionTitle({ icon: Icon, children }) {
    return (
        <div className='mb-3 flex items-center gap-2'>
            <h2 className='flex items-center gap-2 text-sm font-semibold text-neutral-900'>
                {Icon && <Icon className='h-4 w-4 text-brand_main' />}
                {children}
            </h2>
        </div>
    )
}

function Row({ label, value }) {
    return (
        <div className='flex items-baseline justify-between gap-4 py-2'>
            <dt className='w-28 shrink-0 text-xs text-neutral-400'>{label}</dt>
            <dd className='min-w-0 break-words text-right text-sm text-neutral-900'>
                {value || "—"}
            </dd>
        </div>
    )
}
