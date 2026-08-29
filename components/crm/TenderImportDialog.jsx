"use client"
import { useEffect, useState } from "react"
import { LuExternalLink, LuSearch } from "react-icons/lu"
import { formatMoney } from "@/lib/crm/format"
import { formatCrmDate } from "@/lib/crm/datetime"
import { tenderCustomerLabel, tenderlandCardUrl } from "@/lib/crm/tender-map"
import { Badge, Button, Input, Modal } from "@/components/crm/ui"

/**
 * Ручное добавление закупки по номеру — для тех, что автопоиск не поймал, а
 * менеджеру прислали номер со стороны.
 *
 * Найденная закупка попадает в общий список «Не разобраны» и дальше живёт по
 * общим правилам: отслеживается сверкой, кнопкой «Участвуем» разворачивается в
 * сделку. Отдельного пути «сразу в сделку» тут нет намеренно — он бы дублировал
 * разбор карточки, а решение всё равно принимает менеджер.
 *
 * Номер не уникален: на один и тот же номер приезжают разные процедуры. Когда
 * совпадений несколько, сервер возвращает список, и закупку выбирает менеджер.
 */
export default function TenderImportDialog({ open, onClose, onDone }) {
    const [query, setQuery] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [candidates, setCandidates] = useState(null)

    // Диалог переиспользуется, поэтому при каждом открытии начинаем с чистого.
    useEffect(() => {
        if (!open) return
        setQuery("")
        setError("")
        setCandidates(null)
        setLoading(false)
    }, [open])

    async function submit(tenderlandId = null) {
        const number = query.trim()
        if (!number) {
            setError("Введите номер закупки")
            return
        }

        setLoading(true)
        setError("")
        try {
            const res = await fetch("/api/crm/tenders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query: number, tenderlandId }),
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) {
                setError(data?.error || "Не удалось найти закупку")
                return
            }

            if (data.status === "CHOICE") {
                setCandidates(data.candidates || [])
                return
            }
            onDone?.(data)
        } catch (err) {
            setError(err.message || "Сбой сети")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Modal
            open={open}
            onClose={loading ? undefined : onClose}
            title='Добавить закупку по номеру'
            description='Ищем во всём Тендерлэнде, а не только в автопоиске «CRM: воронка закупок» — так добавляются закупки, которые он не поймал.'
            size='xl'
            footer={
                <div className='flex justify-end gap-2'>
                    <Button variant='ghost' onClick={onClose} disabled={loading}>
                        Отмена
                    </Button>
                    <Button onClick={() => submit()} loading={loading}>
                        Найти и добавить
                    </Button>
                </div>
            }
        >
            <form
                onSubmit={e => {
                    e.preventDefault()
                    submit()
                }}
                className='space-y-4'
            >
                <Input
                    label='Номер закупки'
                    value={query}
                    onChange={e => {
                        setQuery(e.target.value)
                        setCandidates(null)
                        setError("")
                    }}
                    icon={LuSearch}
                    hint='Номер извещения с площадки, например 0319200064326000007. Подойдёт и идентификатор Тендерлэнда (TL…).'
                    error={error || undefined}
                    autoComplete='off'
                />

                {candidates ? (
                    <div className='space-y-2'>
                        {/* Номер повторяется у разных процедур: у заказчика
                            совпал внутренний номер, закупку перепубликовали.
                            Какая из них нужна — знает только менеджер. */}
                        <p className='text-sm text-neutral-500'>
                            По этому номеру нашлось несколько закупок — выберите нужную:
                        </p>
                        {candidates.map(c => (
                            <div
                                key={c.tenderlandId}
                                className='rounded-xl border border-line px-4 py-3'
                            >
                                <div className='flex items-start justify-between gap-3'>
                                    <div className='min-w-0 space-y-1'>
                                        <div className='font-medium text-neutral-900'>
                                            {c.name}
                                        </div>
                                        <div className='flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500'>
                                            {c.tenderStatus ? (
                                                <Badge tone='neutral'>{c.tenderStatus}</Badge>
                                            ) : null}
                                            {c.typeName ? <span>{c.typeName}</span> : null}
                                            {c.publishDate ? (
                                                <span>от {formatCrmDate(c.publishDate)}</span>
                                            ) : null}
                                            {Number(c.beginPrice) > 0 ? (
                                                <span>НМЦК {formatMoney(c.beginPrice)}</span>
                                            ) : null}
                                            {/* Из списка кандидатов уходят смотреть карточку
                                                целиком — по названию и НМЦК две перепубликации
                                                одной закупки не различить. Обе ссылки держим
                                                рядом одной строкой. */}
                                            <span className='inline-flex items-center gap-3 whitespace-nowrap'>
                                                {c.sourceLink ? (
                                                    <a
                                                        href={c.sourceLink}
                                                        target='_blank'
                                                        rel='noreferrer'
                                                        className='inline-flex items-center gap-1 text-brand_main hover:underline'
                                                    >
                                                        источник{" "}
                                                        <LuExternalLink className='h-3 w-3' />
                                                    </a>
                                                ) : null}
                                                {tenderlandCardUrl(c.tenderlandId) ? (
                                                    <a
                                                        href={tenderlandCardUrl(c.tenderlandId)}
                                                        target='_blank'
                                                        rel='noreferrer'
                                                        className='inline-flex items-center gap-1 text-brand_main hover:underline'
                                                    >
                                                        Тендерлэнд{" "}
                                                        <LuExternalLink className='h-3 w-3' />
                                                    </a>
                                                ) : null}
                                            </span>
                                        </div>
                                        {c.customerName ? (
                                            <div className='text-xs text-neutral-500'>
                                                {tenderCustomerLabel(c)}
                                            </div>
                                        ) : null}
                                    </div>
                                    <Button
                                        type='button'
                                        size='sm'
                                        variant={c.existing ? "secondary" : "primary"}
                                        disabled={loading}
                                        onClick={() => submit(c.tenderlandId)}
                                    >
                                        {c.existing ? "Уже в списке" : "Добавить"}
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : null}
            </form>
        </Modal>
    )
}
