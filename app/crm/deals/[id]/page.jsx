import Link from "next/link"
import { notFound } from "next/navigation"
import { getServerSession } from "next-auth"
import { LuPencil, LuFileText, LuExternalLink } from "react-icons/lu"
import { authOptions } from "@/configs/auth"
import prisma from "@/lib/client"
import { DEAL_LOSS_REASON_LABELS, dealOwnTitle } from "@/lib/crm/deal"
import { canDeleteDeal, dealItemShipmentUsage, isDealLocked } from "@/lib/crm/access"
import { formatMoney, formatPercent } from "@/lib/crm/format"
import CrmBackLink from "@/components/crm/CrmBackLink"
import DealItemsSection from "@/components/crm/DealItemsSection"
import DealPayerCard from "@/components/crm/DealPayerCard"
import DealStatusControl from "@/components/crm/DealStatusControl"
import DeleteEntityButton from "@/components/crm/DeleteEntityButton"
import DealShipmentsSection from "@/components/crm/DealShipmentsSection"
import ActivityPanel from "@/components/crm/ActivityPanel"
import ContactMeta from "@/components/crm/ContactMeta"
import LocalDateTime from "@/components/crm/LocalDateTime"
import { EntityHeading } from "@/components/crm/ui"

export const metadata = { title: "Сделка | CRM" }

function fullName(u) {
    if (!u) return "—"
    return `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email
}

function contactDisplay(c) {
    if (!c) return null
    const name = `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim()
    return name || c.email || c.phone || "Контакт"
}

export default async function DealPage({ params }) {
    const session = await getServerSession(authOptions)
    const item = await prisma.deal.findUnique({
        where: { id: params.id },
        include: {
            counterparty: true,
            payer: true,
            contact: true,
            manager: true,
            createdBy: true,
            updatedBy: true,
            items: {
                orderBy: { createdAt: "asc" },
                include: {
                    product: { select: { unitWeightKg: true, unitVolumeM3: true } },
                },
            },
            sourceProject: {
                select: { id: true, internalName: true },
            },
            auctionCustomer: { select: { id: true, name: true, region: true } },
            auctionCustomerContact: true,
            // Нужны, чтобы понять, какие позиции уже ушли в проведённые отгрузки.
            shipments: {
                select: {
                    number: true,
                    status: true,
                    items: { select: { dealItemId: true, quantity: true } },
                },
            },
        },
    })
    if (!item) notFound()

    // Завершённая сделка: менеджеру остаётся только панель активности.
    const locked = isDealLocked(item.status, session)

    // Удаление — право администратора и только в «Не реализована»/«Архив».
    // Отдельно предупреждаем про отгрузки: они уедут каскадом вместе со
    // сделкой, включая проведённые.
    const canDelete = canDeleteDeal(item.status, session)
    const shippedCount = item.shipments.filter(s => s.status === "SHIPPED").length

    // В клиентский компонент отдаём только реквизиты: Decimal-поля карточки
    // контрагента не сериализуются.
    const payerForClient = item.payer
        ? {
              id: item.payer.id,
              name: item.payer.name,
              inn: item.payer.inn,
              kpp: item.payer.kpp,
              ogrn: item.payer.ogrn,
              address: item.payer.address,
              bankName: item.payer.bankName,
              bankAccount: item.payer.bankAccount,
              bankCorrAccount: item.payer.bankCorrAccount,
              bik: item.payer.bik,
          }
        : null

    const dealItemsForClient = item.items.map(i => ({
        id: i.id,
        sku: i.sku,
        name: i.name,
        quantity: i.quantity.toString(),
        amount: i.amount.toString(),
        unitWeightKg: i.product?.unitWeightKg != null ? i.product.unitWeightKg.toString() : null,
        unitVolumeM3: i.product?.unitVolumeM3 != null ? i.product.unitVolumeM3.toString() : null,
    }))

    // Скидка в параметрах: сумма скидки и итог со скидкой считаются от суммы сделки.
    const totalAmount = Number(item.totalAmount) || 0
    const discountPct = item.discount != null ? Number(item.discount) : null
    const discountAmount = discountPct != null ? (totalAmount * discountPct) / 100 : null
    const discountedTotal = discountAmount != null ? totalAmount - discountAmount : null

    const itemsForClient = item.items.map(({ product: _product, ...i }) => ({
        ...i,
        quantity: i.quantity.toString(),
        amount: i.amount.toString(),
        createdAt: i.createdAt.toISOString(),
        updatedAt: i.updatedAt.toISOString(),
        // Позиция из проведённой отгрузки редактированию не подлежит.
        ...dealItemShipmentUsage(i.id, item.shipments),
    }))

    const paramsFooter = (
        <>
            Создал {fullName(item.createdBy)} · <LocalDateTime value={item.createdAt} />
            {item.updatedBy && (
                <>
                    {" · "}изменил {fullName(item.updatedBy)} ·{" "}
                    <LocalDateTime value={item.updatedAt} />
                </>
            )}
        </>
    )

    const dealParamRows = (
        <>
            <Row label='Сумма сделки' value={formatMoney(item.totalAmount)} />
            <Row
                label='Скидка'
                value={
                    discountPct != null
                        ? `${formatPercent(discountPct)} (${formatMoney(discountAmount)})`
                        : "—"
                }
            />
            <Row
                label='Сумма со скидкой'
                value={discountedTotal != null ? formatMoney(discountedTotal) : "—"}
            />
            <Row label='Менеджер' value={fullName(item.manager)} />
        </>
    )

    return (
        <div className='space-y-4'>
            <CrmBackLink
                fallback='/crm/deals'
                fallbackLabel='Сделки'
                className='inline-flex items-center gap-1 text-xs text-neutral-400 hover:text-brand_main'
            />

            {/* Шапка повторяет колонки тела страницы: правая ячейка (КП + статус)
                стоит ровно над панелью активности и не сдвигает её вниз. */}
            <div className='grid grid-cols-[minmax(0,1fr)] items-stretch gap-x-4 gap-y-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(360px,1fr)]'>
                <div className='flex min-w-0 items-end justify-between gap-3'>
                    <EntityHeading
                        tone={item.isAuction ? "amber" : "brand"}
                        label={item.isAuction ? "Аукцион" : "Сделка"}
                        meta={
                            item.isAuction && item.purchaseNumber
                                ? `№ ${item.purchaseNumber}`
                                : null
                        }
                        title={dealOwnTitle(item, item.counterparty?.name)}
                    >
                        {item.sourceProject && (
                            <p className='mt-1 text-sm text-blue-700'>
                                По проекту:{" "}
                                <Link
                                    href={`/crm/projects/${item.sourceProject.id}`}
                                    className='underline hover:text-blue-900'
                                >
                                    {item.sourceProject.internalName}
                                </Link>
                            </p>
                        )}
                    </EntityHeading>
                    <div className='flex shrink-0 items-center gap-2'>
                        {!locked && (
                            <Link
                                href={`/crm/deals/${item.id}/edit`}
                                className='inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1.5 text-sm font-medium text-neutral-700 transition hover:bg-surface_muted'
                            >
                                <LuPencil className='h-3.5 w-3.5' />
                                Редактировать
                            </Link>
                        )}
                        {canDelete && (
                            <DeleteEntityButton
                                url={`/api/crm/deals/${item.id}`}
                                redirectTo='/crm/deals'
                                title='Удалить сделку?'
                                name={dealOwnTitle(item, item.counterparty?.name)}
                                consequences={[
                                    "Вместе со сделкой удалятся её позиции, отгрузки, заметки, файлы и задачи.",
                                    shippedCount > 0
                                        ? `Внимание: по сделке есть проведённые отгрузки (${shippedCount}) — они будут удалены вместе с ней.`
                                        : null,
                                ].filter(Boolean)}
                                successText='Сделка удалена'
                            />
                        )}
                    </div>
                </div>
                <div className='flex flex-wrap items-end justify-between gap-2'>
                    <DealStatusControl
                        dealId={item.id}
                        currentStatus={item.status}
                        readOnly={locked}
                    />
                    {!locked && (
                        <Link
                            href={`/crm/deals/${item.id}/proposal`}
                            className='inline-flex items-center gap-1.5 rounded-lg bg-brand_main px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-brand_main/90'
                        >
                            <LuFileText className='h-3 w-3' />
                            Сформировать КП
                        </Link>
                    )}
                </div>
            </div>

            {locked && (
                <div className='rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-600'>
                    Сделка завершена — карточка доступна только для просмотра. Работать
                    можно с заметками, задачами и файлами; изменения вносит администратор.
                </div>
            )}

            {(item.status === "CANCELLED" || item.status === "ARCHIVED") && item.lossReason && (
                <div className='rounded-xl border border-red-200 bg-red-50/60 px-4 py-3'>
                    <p className='text-xs font-semibold uppercase tracking-wide text-red-700'>
                        Причина отмены
                    </p>
                    <p className='mt-1 text-sm text-red-900'>
                        {DEAL_LOSS_REASON_LABELS[item.lossReason] || item.lossReason}
                        {item.lossComment && (
                            <span className='text-red-900/75'> — {item.lossComment}</span>
                        )}
                    </p>
                </div>
            )}

            {/* Two-column body */}
            <div className='grid grid-cols-[minmax(0,1fr)] items-start gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(360px,1fr)]'>
                <div className='min-w-0 space-y-4'>
                    {/* Стороны: клиент, а для аукциона ещё и заказчик */}
                    <div className='grid items-stretch gap-4 sm:grid-cols-2'>
                        <PartyCard
                            label={
                                item.counterparty.type === "DISTRIBUTOR"
                                    ? "Клиент · Дистрибьютор"
                                    : "Клиент · Конечный потребитель"
                            }
                            org={item.counterparty}
                            contact={item.contact}
                        />

                        {item.isAuction ? (
                            <PartyCard
                                label='Заказчик · Конечный потребитель'
                                org={item.auctionCustomer}
                                contact={item.auctionCustomerContact}
                            />
                        ) : (
                            <Section
                                title='Параметры'
                                columns='sm:grid-cols-2'
                                footer={paramsFooter}
                            >
                                {dealParamRows}
                            </Section>
                        )}
                    </div>

                    {payerForClient && (
                        <DealPayerCard
                            payer={payerForClient}
                            clientName={item.counterparty.name}
                        />
                    )}

                    {item.isAuction && (
                        <section className='rounded-xl border border-line bg-white p-4'>
                            <h2 className='mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500'>
                                Параметры
                            </h2>

                            <ParamGroup title='Сделка' columns='sm:grid-cols-2 lg:grid-cols-4'>
                                {dealParamRows}
                            </ParamGroup>

                            {/* Аукционная часть: закупка, сроки и итог — тремя
                                колонками, чтобы всё читалось одним взглядом. */}
                            <div className='mt-3 grid gap-x-4 gap-y-3 border-t border-line pt-3 lg:grid-cols-3'>
                                <ParamGroup title='Закупка' columns='sm:grid-cols-3 lg:grid-cols-1'>
                                    <Row label='НМЦК' value={formatMoney(item.nmck)} />
                                    <Row label='Номер закупки' value={item.purchaseNumber || "—"} />
                                    <Row label='Ссылка на аукцион'>
                                        {item.auctionUrl ? (
                                            <a
                                                href={item.auctionUrl}
                                                target='_blank'
                                                rel='noopener noreferrer'
                                                className='inline-flex items-center gap-1 text-brand_main hover:underline'
                                            >
                                                Открыть
                                                <LuExternalLink className='h-3.5 w-3.5' />
                                            </a>
                                        ) : (
                                            "—"
                                        )}
                                    </Row>
                                </ParamGroup>

                                <ParamGroup
                                    title='Сроки'
                                    columns='sm:grid-cols-3 lg:grid-cols-1'
                                    className='lg:border-l lg:border-line lg:pl-4'
                                >
                                    <Row label='Окончание сбора заявок'>
                                        <LocalDateTime value={item.bidsDeadlineAt} />
                                    </Row>
                                    <Row label='Проведение аукциона'>
                                        <LocalDateTime value={item.auctionAt} />
                                    </Row>
                                    <Row label='Подведение итогов'>
                                        <LocalDateTime value={item.resultsAt} />
                                    </Row>
                                </ParamGroup>

                                <ParamGroup
                                    title='Итоги'
                                    columns='sm:grid-cols-3 lg:grid-cols-1'
                                    className='lg:border-l lg:border-line lg:pl-4'
                                >
                                    <Row label='Количество заявок' value={item.bidsCount ?? "—"} />
                                    <Row
                                        label='Количество участников'
                                        value={item.participantsCount ?? "—"}
                                    />
                                    <Row label='Победитель' value={item.winner || "—"} />
                                </ParamGroup>
                            </div>

                            <p className='mt-3 border-t border-line pt-2 text-[11px] text-neutral-400'>
                                {paramsFooter}
                            </p>
                        </section>
                    )}

                    {(item.deliveryAddress || item.note) && (
                        <Section title='Доставка и примечание'>
                            {item.deliveryAddress && (
                                <div className='sm:col-span-2 lg:col-span-3'>
                                    <dt className='text-[10px] uppercase tracking-wider text-neutral-400'>
                                        Адрес доставки
                                    </dt>
                                    <dd className='mt-0.5 whitespace-pre-wrap text-sm text-neutral-900'>
                                        {item.deliveryAddress}
                                    </dd>
                                </div>
                            )}
                            {item.note && (
                                <div className='sm:col-span-2 lg:col-span-3'>
                                    <dt className='text-[10px] uppercase tracking-wider text-neutral-400'>
                                        Примечание
                                    </dt>
                                    <dd className='mt-0.5 whitespace-pre-wrap text-sm text-neutral-900'>
                                        {item.note}
                                    </dd>
                                </div>
                            )}
                        </Section>
                    )}

                    <DealItemsSection
                        dealId={item.id}
                        initialItems={itemsForClient}
                        readOnly={locked}
                    />

                    <DealShipmentsSection
                        dealId={item.id}
                        dealItems={dealItemsForClient}
                        dealDiscount={discountPct}
                        counterpartyId={item.counterparty.id}
                        initialDeliveryAddress={
                            item.deliveryAddress || item.counterparty.address || ""
                        }
                        readOnly={locked}
                    />
                </div>

                <ActivityPanel
                    entityType='Deal'
                    entityId={item.id}
                    taskRelationKind='deal'
                    currentUserId={session?.user?.id}
                    currentUserRole={session?.user?.role}
                    historyIncludeChildren
                />
            </div>
        </div>
    )
}

function Section({ title, footer, action, columns = "sm:grid-cols-2 lg:grid-cols-3", children }) {
    return (
        <section className='flex flex-col rounded-xl border border-line bg-white p-4'>
            <div className='mb-2.5 flex items-center justify-between gap-3'>
                <h2 className='text-xs font-semibold uppercase tracking-wide text-neutral-500'>
                    {title}
                </h2>
                {action && <div className='shrink-0'>{action}</div>}
            </div>
            <dl className={`grid flex-1 content-start gap-x-4 gap-y-2.5 ${columns}`}>{children}</dl>
            {footer && (
                <p className='mt-3 border-t border-line pt-2 text-[11px] text-neutral-400'>
                    {footer}
                </p>
            )}
        </section>
    )
}

// Группа полей внутри карточки параметров: подпись группы + своя сетка.
// Нужна, чтобы «Параметры сделки» и «Параметры аукциона» читались рядом,
// а не через переключение вкладок.
function ParamGroup({ title, columns = "sm:grid-cols-2 lg:grid-cols-3", className = "", children }) {
    return (
        <div className={className}>
            <p className='mb-2 text-[10px] font-medium uppercase tracking-wider text-neutral-400'>
                {title}
            </p>
            <dl className={`grid gap-x-4 gap-y-2.5 ${columns}`}>{children}</dl>
        </div>
    )
}

// Самодостаточная карточка клиента сделки: роль, организация (ссылка),
// регион и контактное лицо — вся информация о стороне в одном месте.
function PartyCard({ label, org, contact }) {
    const contactName = contactDisplay(contact)
    return (
        <section className='flex flex-col rounded-xl border border-line bg-white p-4'>
            <p className='text-[10px] font-medium uppercase tracking-wider text-neutral-400'>
                {label}
            </p>
            <Link
                href={`/crm/counterparties/${org.id}`}
                className='mt-1 block text-base font-semibold leading-snug text-neutral-900 hover:text-brand_main'
            >
                {org.name}
            </Link>
            <p className='mt-1 text-sm text-neutral-500'>
                <span className='text-neutral-400'>Регион:</span> {org.region || "—"}
            </p>

            <div className='my-3 h-px bg-line' />

            <p className='mb-2 text-[10px] font-medium uppercase tracking-wider text-neutral-400'>
                Контактное лицо
            </p>
            {contact ? (
                <div className='rounded-lg border border-line bg-surface_muted px-3 py-2 text-sm'>
                    <p className='font-medium text-neutral-900'>{contactName}</p>
                    <ContactMeta contact={contact} />
                </div>
            ) : (
                <p className='text-sm text-neutral-400'>Не выбрано.</p>
            )}
        </section>
    )
}

function Row({ label, value, children, className = "" }) {
    return (
        <div className={className}>
            <dt className='text-[10px] uppercase tracking-wider text-neutral-400'>{label}</dt>
            <dd className='mt-0.5 text-sm text-neutral-900'>{children ?? value ?? "—"}</dd>
        </div>
    )
}
