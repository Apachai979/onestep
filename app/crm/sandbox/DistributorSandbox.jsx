"use client"

import { useState } from "react"
import {
    LuPencil,
    LuPhone,
    LuMail,
    LuMapPin,
    LuUser,
    LuBuilding2,
    LuWallet,
    LuPercent,
    LuFolders,
    LuUsers,
    LuChevronRight,
    LuPlus,
    LuFileText,
    LuActivity,
    LuBadgeCheck,
} from "react-icons/lu"
import { Badge, Button, Card, StatCard, Tabs } from "@/components/crm/ui"

/* ------------------------------------------------------------------ */
/*  Мок дистрибьютора — приближен к реальной модели Counterparty       */
/* ------------------------------------------------------------------ */

const D = {
    name: "ООО «МедТорг Поволжье»",
    type: "Дистрибьютор",
    region: "Самарская область",
    inn: "6317045678",
    kpp: "631701001",
    ogrn: "1156317012345",
    okpo: "09876543",
    okved: "46.46",
    phone: "+7 (846) 221-33-44",
    email: "zakupki@medtorg-povolzhye.ru",
    manager: "Иванова Анна",
    address: "443090, г. Самара, ул. Антонова-Овсеенко, д. 44, оф. 312",
    source: "Выставка",
    bik: "043601607",
    bankAccount: "40702810054400001234",
    bankCorrAccount: "30101810200000000607",
    bankName: "Поволжский банк ПАО Сбербанк",
    budget: "12 480 000 ₽",
    discount: "8 %",
    note: "Крупный региональный дистрибьютор. Работаем с 2021 года, стабильные аукционы по перевязке. Требуют отсрочку платежа 30 дней.",
    createdBy: "Петров Илья",
    createdAt: "12.03.2024",
    updatedBy: "Иванова Анна",
    updatedAt: "18.06.2026",
    contacts: [
        { name: "Смирнова Ольга", role: "Руководитель отдела закупок", phone: "+7 (927) 555-12-34", email: "o.smirnova@medtorg.ru", primary: true },
        { name: "Кузнецов Дмитрий", role: "Менеджер по тендерам", phone: "+7 (927) 555-98-76", email: "d.kuznetsov@medtorg.ru", primary: false },
    ],
    projectsTotal: "7 230 000 ₽",
    projects: [
        { auction: "0173200001424001234", name: "Перевязочные наборы — ГКБ №1", customer: "ГБУЗ СО «СГКБ №1»", manager: "Иванова Анна", status: "В работе", statusTone: "info", amount: "3 240 000 ₽" },
        { auction: "0173200001424005678", name: "Стерильные наборы — Роддом", customer: "ГБУЗ «Самарский роддом»", manager: "Иванова Анна", status: "Выиграна", statusTone: "success", amount: "1 890 000 ₽" },
        { auction: "0173200001423009012", name: "Расходники — Онкодиспансер", customer: "ГБУЗ СОКОД", manager: "Петров Илья", status: "Проиграна", statusTone: "danger", amount: "2 100 000 ₽" },
    ],
}

const VARIANTS = [
    { key: "hero", label: "1 · Hero + KPI + табы" },
    { key: "profile", label: "2 · Sticky-профиль" },
    { key: "compact", label: "3 · Плотный, но чистый" },
]

/* ------------------------------------------------------------------ */

export default function DistributorSandbox() {
    const [variant, setVariant] = useState("hero")

    return (
        <div className='space-y-5'>
            {/* Панель-переключатель песочницы (не часть дизайна) */}
            <div className='flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-line_strong bg-surface_muted px-4 py-3'>
                <span className='mr-1 text-xs font-semibold uppercase tracking-wide text-neutral-500'>
                    Песочница · вариант:
                </span>
                {VARIANTS.map(v => (
                    <button
                        key={v.key}
                        type='button'
                        onClick={() => setVariant(v.key)}
                        className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                            variant === v.key
                                ? "bg-brand_main text-white"
                                : "bg-white text-neutral-600 ring-1 ring-line hover:text-neutral-900"
                        }`}
                    >
                        {v.label}
                    </button>
                ))}
            </div>

            {variant === "hero" && <VariantHero />}
            {variant === "profile" && <VariantProfile />}
            {variant === "compact" && <VariantCompact />}
        </div>
    )
}

/* ================================================================== */
/*  ВАРИАНТ 1 — Hero-шапка, ряд KPI, табы разделов                     */
/* ================================================================== */

function VariantHero() {
    const [tab, setTab] = useState("main")
    return (
        <div className='space-y-5'>
            {/* Hero */}
            <div className='overflow-hidden rounded-2xl border border-line bg-white shadow-sm'>
                <div className='flex flex-wrap items-start gap-4 p-6'>
                    <div className='flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand_main/10 text-lg font-semibold text-brand_main'>
                        МП
                    </div>
                    <div className='min-w-0 flex-1'>
                        <div className='flex flex-wrap items-center gap-2'>
                            <Badge tone='brand' dot>
                                {D.type}
                            </Badge>
                            <Badge tone='success'>
                                <LuBadgeCheck className='h-3 w-3' /> Активный
                            </Badge>
                        </div>
                        <h1 className='mt-2 text-2xl font-semibold tracking-tight text-neutral-900'>
                            {D.name}
                        </h1>
                        <div className='mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-neutral-500'>
                            <span className='inline-flex items-center gap-1.5'>
                                <LuMapPin className='h-4 w-4 text-neutral-400' /> {D.region}
                            </span>
                            <span className='inline-flex items-center gap-1.5'>
                                <LuBuilding2 className='h-4 w-4 text-neutral-400' /> ИНН {D.inn}
                            </span>
                            <span className='inline-flex items-center gap-1.5'>
                                <LuUser className='h-4 w-4 text-neutral-400' /> {D.manager}
                            </span>
                        </div>
                    </div>
                    <Button variant='secondary'>
                        <LuPencil className='h-4 w-4' /> Редактировать
                    </Button>
                </div>
            </div>

            {/* KPI */}
            <div className='grid grid-cols-2 gap-4 lg:grid-cols-4'>
                <StatCard label='Бюджет' value={D.budget} icon={LuWallet} tone='brand' />
                <StatCard label='Скидка' value={D.discount} icon={LuPercent} />
                <StatCard label='Проектов' value={D.projects.length} icon={LuFolders} />
                <StatCard label='Контактов' value={D.contacts.length} icon={LuUsers} />
            </div>

            {/* Табы + контент */}
            <div className='grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(340px,1fr)]'>
                <div className='min-w-0 space-y-5'>
                    <Card padding='none'>
                        <div className='px-6 pt-2'>
                            <Tabs
                                value={tab}
                                onChange={setTab}
                                items={[
                                    { key: "main", label: "Основное", icon: LuFileText },
                                    { key: "req", label: "Реквизиты", icon: LuBuilding2 },
                                    { key: "contacts", label: "Контакты", icon: LuUsers, badge: D.contacts.length },
                                ]}
                            />
                        </div>
                        <div className='p-6'>
                            {tab === "main" && (
                                <FieldGrid cols={2}>
                                    <FieldItem icon={LuMapPin} label='Регион' value={D.region} />
                                    <FieldItem icon={LuPhone} label='Телефон' value={D.phone} />
                                    <FieldItem icon={LuMail} label='Email' value={D.email} />
                                    <FieldItem icon={LuUser} label='Менеджер' value={D.manager} />
                                    <FieldItem icon={LuMapPin} label='Адрес' value={D.address} full />
                                    <FieldItem icon={LuActivity} label='Источник' value={D.source} />
                                </FieldGrid>
                            )}
                            {tab === "req" && (
                                <FieldGrid cols={3}>
                                    <FieldItem label='ИНН' value={D.inn} />
                                    <FieldItem label='КПП' value={D.kpp} />
                                    <FieldItem label='ОГРН' value={D.ogrn} />
                                    <FieldItem label='ОКПО' value={D.okpo} />
                                    <FieldItem label='ОКВЭД' value={D.okved} />
                                    <FieldItem label='БИК' value={D.bik} />
                                    <FieldItem label='Расчётный счёт' value={D.bankAccount} full />
                                    <FieldItem label='Корр. счёт' value={D.bankCorrAccount} full />
                                    <FieldItem label='Банк' value={D.bankName} full />
                                </FieldGrid>
                            )}
                            {tab === "contacts" && <ContactsBlock />}
                        </div>
                    </Card>

                    <ProjectsCard />

                    <Card>
                        <h2 className='mb-2 text-sm font-semibold text-neutral-900'>Примечание</h2>
                        <p className='whitespace-pre-wrap text-sm leading-relaxed text-neutral-600'>
                            {D.note}
                        </p>
                    </Card>
                </div>

                <ActivityPlaceholder />
            </div>
        </div>
    )
}

/* ================================================================== */
/*  ВАРИАНТ 2 — Sticky-профиль слева, контент справа                   */
/* ================================================================== */

function VariantProfile() {
    return (
        <div className='grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[320px_minmax(0,1fr)]'>
            {/* Профиль */}
            <div className='lg:sticky lg:top-5 lg:self-start'>
                <Card padding='none' className='overflow-hidden'>
                    <div className='flex flex-col items-center gap-3 border-b border-line bg-surface_muted px-6 py-7 text-center'>
                        <div className='flex h-16 w-16 items-center justify-center rounded-2xl bg-brand_main text-xl font-semibold text-white'>
                            МП
                        </div>
                        <div>
                            <h1 className='text-lg font-semibold leading-tight text-neutral-900'>
                                {D.name}
                            </h1>
                            <p className='mt-1 text-sm text-neutral-500'>{D.region}</p>
                        </div>
                        <div className='flex flex-wrap justify-center gap-1.5'>
                            <Badge tone='brand' dot>{D.type}</Badge>
                            <Badge tone='success'>Активный</Badge>
                        </div>
                    </div>
                    <div className='space-y-3 px-6 py-5'>
                        <ContactLine icon={LuPhone} value={D.phone} />
                        <ContactLine icon={LuMail} value={D.email} />
                        <ContactLine icon={LuUser} value={`Менеджер · ${D.manager}`} />
                        <ContactLine icon={LuMapPin} value={D.address} />
                    </div>
                    <div className='grid grid-cols-2 gap-px border-t border-line bg-line'>
                        <MiniStat label='Бюджет' value={D.budget} />
                        <MiniStat label='Скидка' value={D.discount} />
                    </div>
                    <div className='border-t border-line p-4'>
                        <Button variant='secondary' className='w-full justify-center'>
                            <LuPencil className='h-4 w-4' /> Редактировать
                        </Button>
                    </div>
                </Card>
            </div>

            {/* Контент */}
            <div className='min-w-0 space-y-5'>
                <Card>
                    <SectionTitle icon={LuBuilding2}>Реквизиты и финансы</SectionTitle>
                    <FieldGrid cols={3}>
                        <FieldItem label='ИНН' value={D.inn} />
                        <FieldItem label='КПП' value={D.kpp} />
                        <FieldItem label='ОГРН' value={D.ogrn} />
                        <FieldItem label='ОКПО' value={D.okpo} />
                        <FieldItem label='ОКВЭД' value={D.okved} />
                        <FieldItem label='БИК' value={D.bik} />
                        <FieldItem label='Расчётный счёт' value={D.bankAccount} full />
                        <FieldItem label='Банк' value={D.bankName} full />
                    </FieldGrid>
                </Card>

                <Card>
                    <SectionTitle icon={LuUsers} action={<AddBtn />}>Контакты</SectionTitle>
                    <ContactsBlock />
                </Card>

                <ProjectsCard />

                <Card>
                    <SectionTitle icon={LuFileText}>Примечание</SectionTitle>
                    <p className='whitespace-pre-wrap text-sm leading-relaxed text-neutral-600'>
                        {D.note}
                    </p>
                </Card>
            </div>
        </div>
    )
}

/* ================================================================== */
/*  ВАРИАНТ 3 — Плотный, но с современной типографикой                 */
/* ================================================================== */

function VariantCompact() {
    return (
        <div className='space-y-4'>
            <div className='flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white px-5 py-4 shadow-sm'>
                <div className='min-w-0'>
                    <div className='flex items-center gap-2'>
                        <h1 className='text-xl font-semibold tracking-tight text-neutral-900'>
                            {D.name}
                        </h1>
                        <Badge tone='brand' size='sm'>{D.type}</Badge>
                    </div>
                    <p className='mt-0.5 text-sm text-neutral-500'>
                        {D.region} · ИНН {D.inn} · Менеджер {D.manager}
                    </p>
                </div>
                <div className='flex items-center gap-4'>
                    <div className='text-right'>
                        <p className='text-[11px] uppercase tracking-wide text-neutral-400'>Бюджет</p>
                        <p className='text-lg font-semibold text-brand_main'>{D.budget}</p>
                    </div>
                    <div className='h-9 w-px bg-line' />
                    <div className='text-right'>
                        <p className='text-[11px] uppercase tracking-wide text-neutral-400'>Скидка</p>
                        <p className='text-lg font-semibold text-neutral-900'>{D.discount}</p>
                    </div>
                    <Button variant='secondary'>
                        <LuPencil className='h-4 w-4' /> Изменить
                    </Button>
                </div>
            </div>

            <div className='grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(340px,1fr)]'>
                <div className='min-w-0 space-y-4'>
                    <div className='space-y-4'>
                        <Card padding='sm'>
                            <SectionTitle icon={LuFileText} sm>Контактные данные</SectionTitle>
                            <dl className='divide-y divide-line'>
                                <CompactRow label='Телефон' value={D.phone} />
                                <CompactRow label='Email' value={D.email} />
                                <CompactRow label='Адрес' value={D.address} />
                                <CompactRow label='Источник' value={D.source} />
                            </dl>
                        </Card>
                        <Card padding='sm'>
                            <SectionTitle icon={LuBuilding2} sm>Реквизиты</SectionTitle>
                            <dl className='divide-y divide-line'>
                                <CompactRow label='ИНН / КПП' value={`${D.inn} / ${D.kpp}`} />
                                <CompactRow label='ОГРН' value={D.ogrn} />
                                <CompactRow label='Расчётный счёт' value={D.bankAccount} />
                                <CompactRow label='Банк' value={D.bankName} />
                            </dl>
                        </Card>
                    </div>

                    <ProjectsCard dense />

                    <Card padding='sm'>
                        <SectionTitle icon={LuUsers} sm action={<AddBtn />}>Контакты</SectionTitle>
                        <ContactsBlock dense />
                    </Card>
                </div>

                <ActivityPlaceholder />
            </div>
        </div>
    )
}

/* ================================================================== */
/*  Общие под-компоненты                                               */
/* ================================================================== */

function FieldGrid({ cols = 2, children }) {
    const c = cols === 3 ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2"
    return <dl className={`grid gap-x-6 gap-y-5 ${c}`}>{children}</dl>
}

function FieldItem({ icon: Icon, label, value, full = false }) {
    return (
        <div className={full ? "sm:col-span-2 lg:col-span-3" : ""}>
            <dt className='flex items-center gap-1.5 text-xs font-medium text-neutral-400'>
                {Icon && <Icon className='h-3.5 w-3.5' />}
                {label}
            </dt>
            <dd className='mt-1 text-sm text-neutral-900'>{value || "—"}</dd>
        </div>
    )
}

function CompactRow({ label, value }) {
    return (
        <div className='flex items-baseline justify-between gap-4 py-2'>
            <dt className='w-28 shrink-0 text-xs text-neutral-400'>{label}</dt>
            <dd className='min-w-0 break-words text-right text-sm text-neutral-900'>
                {value || "—"}
            </dd>
        </div>
    )
}

function SectionTitle({ icon: Icon, action, sm = false, children }) {
    return (
        <div className={`flex items-center justify-between gap-3 ${sm ? "mb-3" : "mb-4"}`}>
            <h2 className='flex items-center gap-2 text-sm font-semibold text-neutral-900'>
                {Icon && <Icon className='h-4 w-4 text-brand_main' />}
                {children}
            </h2>
            {action}
        </div>
    )
}

function ContactLine({ icon: Icon, value }) {
    return (
        <div className='flex items-start gap-2.5 text-sm text-neutral-700'>
            <Icon className='mt-0.5 h-4 w-4 shrink-0 text-neutral-400' />
            <span className='min-w-0'>{value}</span>
        </div>
    )
}

function MiniStat({ label, value }) {
    return (
        <div className='bg-white px-6 py-4 text-center'>
            <p className='text-[11px] uppercase tracking-wide text-neutral-400'>{label}</p>
            <p className='mt-1 text-base font-semibold text-neutral-900'>{value}</p>
        </div>
    )
}

function AddBtn() {
    return (
        <button
            type='button'
            className='inline-flex items-center gap-1 rounded-md border border-line bg-white px-2 py-1 text-xs font-medium text-neutral-600 hover:bg-surface_muted'
        >
            <LuPlus className='h-3.5 w-3.5' /> Добавить
        </button>
    )
}

function ContactsBlock({ dense = false }) {
    if (dense) {
        return (
            <ul className='divide-y divide-line'>
                {D.contacts.map(c => (
                    <li
                        key={c.name}
                        className='-mx-2 flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-surface_muted'
                    >
                        <div className='flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-[10px] font-semibold text-neutral-600'>
                            {c.name.split(" ").map(w => w[0]).join("")}
                        </div>
                        <div className='min-w-0 flex-1'>
                            <div className='flex items-center gap-1.5'>
                                <span className='truncate text-sm font-medium text-neutral-900'>{c.name}</span>
                                {c.primary && <Badge tone='brand' size='sm'>Осн.</Badge>}
                            </div>
                            <p className='truncate text-xs text-neutral-500'>{c.role}</p>
                        </div>
                        <div className='hidden shrink-0 text-right text-xs text-neutral-500 md:block'>
                            <a href={`tel:${c.phone}`} className='block hover:text-brand_main'>{c.phone}</a>
                            <a href={`mailto:${c.email}`} className='block truncate hover:text-brand_main'>{c.email}</a>
                        </div>
                    </li>
                ))}
            </ul>
        )
    }
    return (
        <ul className='space-y-3'>
            {D.contacts.map(c => (
                <li
                    key={c.name}
                    className='flex items-center gap-3 rounded-xl border border-line p-3 transition-colors hover:border-line_strong hover:bg-surface_muted'
                >
                    <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold text-neutral-600'>
                        {c.name.split(" ").map(w => w[0]).join("")}
                    </div>
                    <div className='min-w-0 flex-1'>
                        <div className='flex items-center gap-2'>
                            <span className='truncate text-sm font-medium text-neutral-900'>{c.name}</span>
                            {c.primary && <Badge tone='brand' size='sm'>Основной</Badge>}
                        </div>
                        <p className='truncate text-xs text-neutral-500'>{c.role}</p>
                    </div>
                    <div className='hidden shrink-0 text-right text-xs text-neutral-500 sm:block'>
                        <p>{c.phone}</p>
                        <p className='truncate'>{c.email}</p>
                    </div>
                </li>
            ))}
        </ul>
    )
}

function ProjectsCard({ dense = false }) {
    const won = D.projects.filter(p => p.statusTone === "success").length
    return (
        <Card padding={dense ? "sm" : "md"}>
            <SectionTitle
                icon={LuFolders}
                sm={dense}
                action={
                    <span className='text-xs text-neutral-400'>
                        Выиграно {won} из {D.projects.length} · на сумму{" "}
                        <span className='font-semibold text-neutral-900'>{D.projectsTotal}</span>
                    </span>
                }
            >
                История связок · {D.projects.length}
            </SectionTitle>
            <ul className='space-y-2'>
                {D.projects.map(p => (
                    <li
                        key={p.auction}
                        className='group flex items-center gap-3 rounded-xl border border-line p-3 transition-colors hover:border-line_strong hover:bg-surface_muted'
                    >
                        <div className='min-w-0 flex-1'>
                            <div className='flex items-center gap-2'>
                                <span className='truncate text-sm font-medium text-neutral-900'>{p.name}</span>
                                <Badge tone={p.statusTone} size='sm'>{p.status}</Badge>
                            </div>
                            <p className='mt-0.5 truncate text-xs text-neutral-500'>
                                {p.customer} · Аукцион {p.auction}
                            </p>
                        </div>
                        <span className='shrink-0 text-sm font-medium text-neutral-900'>{p.amount}</span>
                        <LuChevronRight className='h-4 w-4 shrink-0 text-neutral-300 transition-colors group-hover:text-neutral-500' />
                    </li>
                ))}
            </ul>
        </Card>
    )
}

function ActivityPlaceholder() {
    return (
        <Card className='lg:sticky lg:top-5 lg:self-start'>
            <SectionTitle icon={LuActivity}>Активность и задачи</SectionTitle>
            <div className='space-y-3'>
                <div className='rounded-xl border border-dashed border-line p-4 text-center text-sm text-neutral-400'>
                    Здесь останется существующая панель активности
                    <br />
                    (ActivityPanel) — не трогаем.
                </div>
            </div>
        </Card>
    )
}
