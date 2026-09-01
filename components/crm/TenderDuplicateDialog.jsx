"use client"
import { LuArrowUpRight } from "react-icons/lu"
import { formatMoney } from "@/lib/crm/format"
import { formatCrmDate } from "@/lib/crm/datetime"
import { DEAL_STATUS_LABELS } from "@/lib/crm/deal"
import { Badge, Button, Modal } from "@/components/crm/ui"

/**
 * «Похоже, эта закупка уже в работе» — развилка перед созданием сделки.
 *
 * Аукционную сделку заводят с двух сторон: менеджер продаж — после разговора с
 * врачом, ещё до публикации закупки; менеджер, разбирающий поток из
 * Тендерлэнда, — кнопкой «Участвуем». Без этой развилки в CRM появлялись две
 * сделки по одной продаже, и дальше по ним отдельно считались обеспечение,
 * продажи и доска аукционов.
 *
 * Решает менеджер, а не автоматика: разные закупки одного ЛПУ похожи сильнее,
 * чем кажется, а разлепить склеенные сделки будет некому. Поэтому «создать
 * новую» здесь равноправная кнопка, а не спрятанный запасной ход.
 */

// Насколько мы уверены, что это та же закупка. Порядок — как в ответе сервера.
const CONFIDENCE = {
    EXACT: { label: "Это она", tone: "danger" },
    STRONG: { label: "Скорее всего, она", tone: "warning" },
    WEAK: { label: "Возможно, другая", tone: "neutral" },
}

export default function TenderDuplicateDialog({
    open,
    tender,
    candidates = [],
    busy = false,
    onLink,
    onCreateNew,
    onClose,
}) {
    return (
        <Modal
            open={open}
            onClose={busy ? undefined : onClose}
            title='Похоже, эта закупка уже в работе'
            description='Если это та же продажа — привяжите закупку к существующей сделке: её данные дозаполнят пустые поля карточки. Вторая сделка по одной закупке задваивает обеспечение и продажи.'
            size='2xl'
            footer={
                <div className='flex flex-wrap justify-end gap-2'>
                    <Button variant='ghost' onClick={onClose} disabled={busy}>
                        Отмена
                    </Button>
                    {/* Равноправный выход: совпадение могло быть ложным — у ЛПУ
                        бывает несколько закупок подряд. */}
                    <Button variant='secondary' onClick={onCreateNew} disabled={busy}>
                        Это другая закупка — создать новую сделку
                    </Button>
                </div>
            }
        >
            <div className='space-y-4'>
                {tender ? (
                    <div className='rounded-xl bg-neutral-50 px-4 py-3'>
                        <div className='text-xs uppercase tracking-wide text-neutral-400'>
                            Разбираемая закупка
                        </div>
                        <div className='pt-1 text-sm font-medium text-neutral-900'>
                            {tender.name}
                        </div>
                        <div className='flex flex-wrap gap-x-3 gap-y-1 pt-1 text-xs text-neutral-500'>
                            {tender.regNumber ? <span>№ {tender.regNumber}</span> : null}
                            {tender.typeName ? <span>{tender.typeName}</span> : null}
                            {Number(tender.beginPrice) > 0 ? (
                                <span>НМЦК {formatMoney(tender.beginPrice)}</span>
                            ) : null}
                            {tender.endDate ? (
                                <span>заявки до {formatCrmDate(tender.endDate)}</span>
                            ) : null}
                        </div>
                    </div>
                ) : null}

                <div className='space-y-2'>
                    {candidates.map(c => {
                        const mark = CONFIDENCE[c.confidence] || CONFIDENCE.WEAK
                        return (
                            <div key={c.id} className='rounded-xl border border-line px-4 py-3'>
                                <div className='flex items-start justify-between gap-3'>
                                    <div className='min-w-0 space-y-1'>
                                        <div className='flex flex-wrap items-center gap-2'>
                                            <Badge tone={mark.tone}>{mark.label}</Badge>
                                            <span className='text-xs text-neutral-500'>
                                                {c.reasons.join(", ")}
                                            </span>
                                        </div>
                                        <div className='font-medium text-neutral-900'>{c.title}</div>
                                        <div className='flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500'>
                                            <span>{DEAL_STATUS_LABELS[c.status] || c.status}</span>
                                            {c.purchaseNumber ? <span>№ {c.purchaseNumber}</span> : null}
                                            {Number(c.nmck) > 0 ? (
                                                <span>НМЦК {formatMoney(c.nmck)}</span>
                                            ) : null}
                                            {c.bidsDeadlineAt ? (
                                                <span>заявки до {formatCrmDate(c.bidsDeadlineAt)}</span>
                                            ) : null}
                                            {c.auctionAt ? (
                                                <span>торги {formatCrmDate(c.auctionAt)}</span>
                                            ) : null}
                                        </div>
                                        <div className='flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500'>
                                            {c.managerName ? <span>менеджер: {c.managerName}</span> : null}
                                            {c.clientName ? <span>клиент: {c.clientName}</span> : null}
                                            {c.customerName ? <span>заказчик: {c.customerName}</span> : null}
                                        </div>
                                        {/* Закупки, уже заведённые в эту сделку: по ним видно, что
                                            там лежит запрос цен, а разбирается сейчас электронный
                                            аукцион по тому же предмету. */}
                                        {c.tenders?.length ? (
                                            <div className='text-xs text-neutral-400'>
                                                уже в сделке:{" "}
                                                {c.tenders
                                                    .map(t =>
                                                        [t.regNumber, t.typeName]
                                                            .filter(Boolean)
                                                            .join(" · "),
                                                    )
                                                    .join("; ")}
                                            </div>
                                        ) : null}
                                    </div>
                                    <div className='flex shrink-0 flex-col items-end gap-2'>
                                        <Button
                                            type='button'
                                            size='sm'
                                            disabled={busy}
                                            onClick={() => onLink?.(c.id)}
                                        >
                                            Привязать
                                        </Button>
                                        <a
                                            href={`/crm/deals/${c.id}`}
                                            target='_blank'
                                            rel='noreferrer'
                                            className='inline-flex items-center gap-1 text-xs text-brand_main hover:underline'
                                        >
                                            открыть сделку
                                            <LuArrowUpRight className='h-3 w-3' />
                                        </a>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </Modal>
    )
}
