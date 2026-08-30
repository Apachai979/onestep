"use client"
import { useEffect, useRef, useState } from "react"
import {
    LuChevronDown,
    LuDownload,
    LuFileSpreadsheet,
    LuMail,
    LuPaperclip,
    LuSave,
    LuX,
} from "react-icons/lu"
import {
    bumpProposalNumber,
    formatProposalNumber,
    proposalNumberBase,
} from "@/lib/crm/proposal-number"
import { PROPOSAL_INTRO } from "@/lib/crm/proposal-seller"
import { fillTemplate } from "@/lib/crm/template"
import { MAX_MAIL_ATTACHMENTS_SIZE, formatBytes } from "@/lib/crm/attachment"
import { useToast } from "@/components/crm/ui"
import CrmBackLink from "@/components/crm/CrmBackLink"

function todayStr() {
    const d = new Date()
    const dd = String(d.getDate()).padStart(2, "0")
    const mm = String(d.getMonth() + 1).padStart(2, "0")
    return `${dd}.${mm}.${d.getFullYear()}`
}

function todayInput() {
    const d = new Date()
    const dd = String(d.getDate()).padStart(2, "0")
    const mm = String(d.getMonth() + 1).padStart(2, "0")
    return `${d.getFullYear()}-${mm}-${dd}`
}

function fmtInputDate(d) {
    if (!d) return todayStr()
    const dt = new Date(d)
    if (Number.isNaN(dt.getTime())) return todayStr()
    const dd = String(dt.getDate()).padStart(2, "0")
    const mm = String(dt.getMonth() + 1).padStart(2, "0")
    return `${dd}.${mm}.${dt.getFullYear()}`
}

// Пауза перед перерисовкой предпросмотра: столько форма ждёт после последней
// правки, прежде чем идти за новым PDF.
const PREVIEW_DELAY_MS = 700

function downloadBlob(blob, fileName) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
}

function fmtAuto(n, digits) {
    const v = Math.round((Number(n) || 0) * 10 ** digits) / 10 ** digits
    return v.toLocaleString("ru-RU", { maximumFractionDigits: digits })
}

export default function ProposalView({
    dealId,
    defaultNumber,
    buyer,
    endCustomer = "",
    contactName = "",
    contactEmail = "",
    itemsCount = 0,
    defaultDiscount,
    defaultWeight,
    defaultVolume,
    senderName,
    senderPhone,
    senderEmail,
}) {
    const [form, setForm] = useState({
        // Номер приходит с сервера (следующая версия по сделке); фоллбэк —
        // первая версия, если страницу отрисовали без него.
        number: defaultNumber || formatProposalNumber(proposalNumberBase(dealId), 1),
        date: todayInput(),
        validDays: 60,
        buyer,
        endCustomer: endCustomer || "",
        // Галочка «Выводить в КП». Пустое значение прячет строку в любом случае —
        // если конечного потребителя в проекте нет, в документе он не появится.
        showEndCustomer: true,
        deliveryTerm: "90 дней с момента оплаты",
        paymentTerm: "100%",
        deliveryCondition: "самовывоз, отгрузка производится кратно транспортным упаковкам",
        intro: PROPOSAL_INTRO,
        discount: defaultDiscount || 0,
        vatRate: 10,
        volume: defaultVolume > 0 ? fmtAuto(defaultVolume, 3) : "",
        weight: defaultWeight > 0 ? fmtAuto(defaultWeight, 1) : "",
        senderName: senderName || "",
        senderPhone: senderPhone || "",
        senderEmail: senderEmail || "",
    })

    function update(field) {
        return e => setForm(prev => ({ ...prev, [field]: e.target.value }))
    }

    // Номер, который уже лёг в документы сделки или уехал клиенту, — потрачен.
    // Сразу переводим форму на следующую версию: иначе повторное сохранение
    // кладёт рядом второй файл с тем же именем, и разбирать их приходится руками.
    function bumpNumber() {
        setForm(prev => ({ ...prev, number: bumpProposalNumber(prev.number) }))
    }

    const showEndCustomerRow = form.showEndCustomer && Boolean(form.endCustomer.trim())

    const fileNameRef = useRef("")
    fileNameRef.current = `Коммерческое предложение № ${form.number} от ${fmtInputDate(form.date)}`

    const toast = useToast()
    const [saving, setSaving] = useState(false)
    const [exporting, setExporting] = useState(false)
    const [downloading, setDownloading] = useState(false)
    const [sendOpen, setSendOpen] = useState(false)
    // Параметры обычно правят один раз в начале — блок сворачивается,
    // чтобы сам документ был выше на экране.
    const [paramsOpen, setParamsOpen] = useState(true)

    const [pdfUrl, setPdfUrl] = useState("")
    const [previewing, setPreviewing] = useState(false)
    const [previewError, setPreviewError] = useState("")
    // Счётчик ручных повторов: правки формы могут и не последовать, а упавший
    // рендер нужно чем-то перезапустить.
    const [previewAttempt, setPreviewAttempt] = useState(0)
    const previewRef = useRef(null)
    // Blob предпросмотра живёт до следующего рендера; ссылку держим в ref,
    // чтобы отзывать её вне рендера — иначе браузер копит объекты в памяти.
    const pdfUrlRef = useRef("")

    function showPdf(url) {
        if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current)
        pdfUrlRef.current = url
        setPdfUrl(url)
    }

    useEffect(
        () => () => {
            if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current)
        },
        [],
    )

    // Предпросмотр рендерит сервер — тем же кодом, что уходит в файл и в письмо.
    // Правки в полях сыпятся посимвольно, поэтому запрос откладываем и обрываем
    // предыдущий: иначе на каждую букву уходил бы полный рендер PDF.
    const formKey = JSON.stringify(form)
    useEffect(() => {
        const controller = new AbortController()
        const timer = setTimeout(async () => {
            setPreviewing(true)
            try {
                const res = await fetch(`/api/crm/deals/${dealId}/proposal/pdf`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: formKey,
                    signal: controller.signal,
                })
                if (!res.ok) {
                    const data = await res.json().catch(() => ({}))
                    setPreviewError(data?.error || "Не удалось сформировать предпросмотр")
                    return
                }
                showPdf(URL.createObjectURL(await res.blob()))
                setPreviewError("")
            } catch (err) {
                if (err?.name !== "AbortError") {
                    setPreviewError(err?.message || "Не удалось сформировать предпросмотр")
                }
            } finally {
                if (!controller.signal.aborted) setPreviewing(false)
            }
        }, PREVIEW_DELAY_MS)
        return () => {
            clearTimeout(timer)
            controller.abort()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dealId, formKey, previewAttempt])

    async function handleDownloadPdf() {
        if (typeof window === "undefined") return
        setDownloading(true)
        try {
            // Скачиваем свежий рендер, а не blob предпросмотра: между правкой
            // поля и нажатием кнопки предпросмотр может быть ещё старым.
            const res = await fetch(`/api/crm/deals/${dealId}/proposal/pdf`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            })
            if (!res.ok) {
                const data = await res.json().catch(() => ({}))
                toast.error(data?.error || "Не удалось сформировать PDF")
                return
            }
            downloadBlob(await res.blob(), `${fileNameRef.current || "Коммерческое предложение"}.pdf`)
        } catch (err) {
            toast.error(err?.message || "Не удалось сформировать PDF")
        } finally {
            setDownloading(false)
        }
    }

    async function handleExportXlsx() {
        if (typeof window === "undefined") return
        setExporting(true)
        try {
            const res = await fetch(`/api/crm/deals/${dealId}/proposal/xlsx`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            })
            if (!res.ok) {
                const data = await res.json().catch(() => ({}))
                toast.error(data?.error || "Не удалось сформировать Excel")
                return
            }
            downloadBlob(
                await res.blob(),
                `${fileNameRef.current || "Коммерческое предложение"}.xlsx`,
            )
        } catch (err) {
            toast.error(err?.message || "Не удалось сформировать Excel")
        } finally {
            setExporting(false)
        }
    }

    async function handleSaveToDeal() {
        if (typeof window === "undefined") return
        setSaving(true)
        try {
            const fileName = `${fileNameRef.current || "Коммерческое предложение"}.pdf`

            // Серверный рендер через @react-pdf/renderer — даёт настоящий
            // vector-PDF с корректной кириллицей, без сдвигов и мыла.
            const pdfRes = await fetch(`/api/crm/deals/${dealId}/proposal/pdf`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            })
            if (!pdfRes.ok) {
                const data = await pdfRes.json().catch(() => ({}))
                toast.error(data?.error || "Не удалось сгенерировать PDF")
                return
            }
            const blob = await pdfRes.blob()

            const uploadForm = new FormData()
            uploadForm.append("entityType", "Deal")
            uploadForm.append("entityId", dealId)
            uploadForm.append("file", new File([blob], fileName, { type: "application/pdf" }))
            const upRes = await fetch("/api/crm/attachments", {
                method: "POST",
                body: uploadForm,
            })
            const upData = await upRes.json().catch(() => ({}))
            if (!upRes.ok) {
                toast.error(upData?.error || "Не удалось сохранить в сделку")
                return
            }
            toast.success("КП сохранено в документы сделки", { title: fileName })
            bumpNumber()
        } catch (err) {
            toast.error(err?.message || "Не удалось сформировать PDF")
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className='space-y-6'>
            <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                <CrmBackLink
                    fallback={`/crm/deals/${dealId}`}
                    fallbackLabel='К сделке'
                    className='inline-flex items-center gap-1 self-start whitespace-nowrap text-sm text-neutral-500 hover:text-brand_main'
                />
                <div className='flex flex-col gap-2 sm:flex-row sm:flex-wrap'>
                    <button
                        type='button'
                        onClick={() => setSendOpen(true)}
                        className='inline-flex items-center justify-center gap-1.5 rounded-lg border border-brand_main/40 bg-white px-4 py-2 text-sm font-semibold text-brand_main shadow-sm transition hover:bg-brand_main/5'
                        title='Отправить КП клиенту письмом с PDF во вложении'
                    >
                        <LuMail className='h-4 w-4' />
                        Отправить на email
                    </button>
                    <button
                        type='button'
                        onClick={handleSaveToDeal}
                        disabled={saving}
                        className='inline-flex items-center justify-center gap-1.5 rounded-lg border border-brand_main/40 bg-white px-4 py-2 text-sm font-semibold text-brand_main shadow-sm transition hover:bg-brand_main/5 disabled:opacity-50'
                        title='Сформировать PDF и приложить к документам сделки'
                    >
                        <LuSave className={`h-4 w-4 ${saving ? "animate-spin" : ""}`} />
                        {saving ? "Сохраняем…" : "Сохранить в сделку"}
                    </button>
                    <button
                        type='button'
                        onClick={handleExportXlsx}
                        disabled={exporting}
                        className='inline-flex items-center justify-center gap-1.5 rounded-lg border border-brand_main/40 bg-white px-4 py-2 text-sm font-semibold text-brand_main shadow-sm transition hover:bg-brand_main/5 disabled:opacity-50'
                        title='Скачать КП таблицей Excel (.xlsx)'
                    >
                        <LuFileSpreadsheet className='h-4 w-4' />
                        {exporting ? "Формируем…" : "Скачать Excel"}
                    </button>
                    <button
                        type='button'
                        onClick={handleDownloadPdf}
                        disabled={downloading}
                        className='inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand_main px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand_main/90 disabled:opacity-50'
                        title='Скачать PDF на компьютер'
                    >
                        <LuDownload className='h-4 w-4' />
                        {downloading ? "Формируем…" : "Скачать PDF"}
                    </button>
                </div>
            </div>

            <section className='rounded-xl border border-line bg-white'>
                <button
                    type='button'
                    onClick={() => setParamsOpen(o => !o)}
                    className='flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left'
                    title={paramsOpen ? "Свернуть параметры" : "Развернуть параметры"}
                >
                    <h2 className='text-xs font-semibold uppercase tracking-wide text-neutral-500'>
                        Параметры КП
                    </h2>
                    <LuChevronDown
                        className={`h-4 w-4 shrink-0 text-neutral-400 transition ${
                            paramsOpen ? "rotate-180" : ""
                        }`}
                    />
                </button>
                {paramsOpen && (
                    <div className='grid grid-cols-1 gap-x-3 gap-y-2 border-t border-line px-4 pb-4 pt-3 sm:grid-cols-12'>
                        <Field label='Номер КП' className='sm:col-span-3'>
                            <Input value={form.number} onChange={update("number")} />
                        </Field>
                        <Field label='Дата' className='sm:col-span-3'>
                            <Input type='date' value={form.date} onChange={update("date")} />
                        </Field>
                        <Field label='Действ., раб. дней' className='sm:col-span-2'>
                            <Input
                                type='number'
                                min='1'
                                value={form.validDays}
                                onChange={update("validDays")}
                            />
                        </Field>
                        <Field label='Скидка, %' className='sm:col-span-2'>
                            <Input
                                type='number'
                                min='0'
                                max='100'
                                step='0.01'
                                value={form.discount}
                                onChange={update("discount")}
                            />
                        </Field>
                        <Field label='НДС, %' className='sm:col-span-2'>
                            <Input
                                type='number'
                                min='0'
                                max='100'
                                step='0.01'
                                value={form.vatRate}
                                onChange={update("vatRate")}
                            />
                        </Field>

                        <Field label='Покупатель' className='sm:col-span-6'>
                            <Input value={form.buyer} onChange={update("buyer")} />
                        </Field>
                        <Field
                            label='Конечный потребитель'
                            className='sm:col-span-6'
                            action={
                                <label
                                    className={`inline-flex items-center gap-1 text-[11px] ${
                                        showEndCustomerRow ? "text-neutral-500" : "text-neutral-300"
                                    }`}
                                    title={
                                        form.endCustomer.trim()
                                            ? "Выводить строку в КП"
                                            : "Поле пустое — строка в КП не выводится"
                                    }
                                >
                                    <input
                                        type='checkbox'
                                        checked={showEndCustomerRow}
                                        disabled={!form.endCustomer.trim()}
                                        onChange={e =>
                                            setForm(prev => ({
                                                ...prev,
                                                showEndCustomer: e.target.checked,
                                            }))
                                        }
                                        className='h-3.5 w-3.5 rounded accent-brand_main disabled:opacity-40'
                                    />
                                    Выводить в КП
                                </label>
                            }
                        >
                            <Input
                                value={form.endCustomer}
                                onChange={update("endCustomer")}
                                placeholder='подтягивается из проекта'
                            />
                        </Field>

                        <Field label='Срок поставки' className='sm:col-span-4'>
                            <Input value={form.deliveryTerm} onChange={update("deliveryTerm")} />
                        </Field>
                        <Field label='Условия оплаты' className='sm:col-span-4'>
                            <Input value={form.paymentTerm} onChange={update("paymentTerm")} />
                        </Field>
                        <Field label='Условия поставки' className='sm:col-span-4'>
                            <Input
                                value={form.deliveryCondition}
                                onChange={update("deliveryCondition")}
                            />
                        </Field>

                        <Field label='Вступительная строка' className='sm:col-span-8'>
                            <textarea
                                rows={2}
                                value={form.intro}
                                onChange={update("intro")}
                                className='w-full rounded-lg border border-line px-2.5 py-1.5 text-[13px] shadow-sm focus:border-brand_main focus:outline-none'
                            />
                        </Field>
                        <Field label='Объём, м³ (авто)' className='sm:col-span-2'>
                            <Input
                                value={form.volume}
                                onChange={update("volume")}
                                placeholder='из позиций'
                            />
                        </Field>
                        <Field label='Вес, кг (авто)' className='sm:col-span-2'>
                            <Input
                                value={form.weight}
                                onChange={update("weight")}
                                placeholder='из позиций'
                            />
                        </Field>

                        <Field label='Подписант — имя' className='sm:col-span-4'>
                            <Input value={form.senderName} onChange={update("senderName")} />
                        </Field>
                        <Field label='Телефон' className='sm:col-span-4'>
                            <Input value={form.senderPhone} onChange={update("senderPhone")} />
                        </Field>
                        <Field label='Email' className='sm:col-span-4'>
                            <Input value={form.senderEmail} onChange={update("senderEmail")} />
                        </Field>
                    </div>
                )}
            </section>

            {sendOpen && (
                <SendProposalDialog
                    dealId={dealId}
                    form={form}
                    contactName={contactName}
                    contactEmail={contactEmail}
                    fileName={`${fileNameRef.current}.pdf`}
                    onSent={bumpNumber}
                    onClose={() => setSendOpen(false)}
                />
            )}

            {itemsCount === 0 ? (
                <p className='rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800'>
                    В сделке нет товарных позиций — таблица в КП будет пустой.
                </p>
            ) : null}

            {/* Предпросмотр — тот же PDF, который уйдёт клиенту. Раньше здесь
                жила вторая, html-вёрстка документа: она разъезжалась с PDF
                (свои заголовки колонок, свои ширины, свой логотип) и не
                показывала главного — где лягут переносы и границы страниц. */}
            <section className='rounded-xl border border-line bg-white'>
                <div className='flex items-center justify-between gap-2 border-b border-line px-4 py-2.5'>
                    <h2 className='text-xs font-semibold uppercase tracking-wide text-neutral-500'>
                        Предпросмотр
                    </h2>
                    <span className='text-[11px] text-neutral-400'>
                        {previewing ? "Обновляем…" : "Так уйдёт клиенту"}
                    </span>
                </div>
                {previewError ? (
                    <div className='px-4 py-10 text-center'>
                        <p className='text-sm text-red-600'>{previewError}</p>
                        <button
                            type='button'
                            onClick={() => setPreviewAttempt(n => n + 1)}
                            className='mt-2 rounded-lg border border-line px-3 py-1.5 text-sm text-neutral-700 transition hover:bg-surface_muted'
                        >
                            Повторить
                        </button>
                    </div>
                ) : pdfUrl ? (
                    <div className='relative'>
                        <iframe
                            ref={previewRef}
                            // Масштаб 100%: документ показывается в натуральную
                            // величину, как он выйдет на бумаге.
                            src={`${pdfUrl}#zoom=100`}
                            title='Коммерческое предложение'
                            className='h-[80vh] w-full rounded-b-xl'
                        />
                        {previewing ? (
                            <div className='pointer-events-none absolute inset-0 rounded-b-xl bg-white/40' />
                        ) : null}
                    </div>
                ) : (
                    <p className='px-4 py-10 text-center text-sm text-neutral-400'>
                        Формируем предпросмотр…
                    </p>
                )}
            </section>
        </div>
    )
}

// В карточках контактов email нередко записан списком через запятую —
// для отправки берём первый валидный адрес.
function firstEmail(s) {
    const m = String(s || "").match(/[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+/)
    return m ? m[0] : ""
}

function SendProposalDialog({
    dealId,
    form,
    contactName,
    contactEmail,
    fileName,
    onSent,
    onClose,
}) {
    const toast = useToast()
    const [to, setTo] = useState(firstEmail(contactEmail))
    const [subject, setSubject] = useState("")
    const [message, setMessage] = useState("")
    const [saveCopy, setSaveCopy] = useState(true)
    const [loading, setLoading] = useState(true)
    const [sending, setSending] = useState(false)
    const [error, setError] = useState("")
    // Дополнительные вложения: галочками из документов сделки и файлами с компьютера.
    const [dealFiles, setDealFiles] = useState([])
    const [selectedIds, setSelectedIds] = useState([])
    const [extraFiles, setExtraFiles] = useState([])
    const fileInputRef = useRef(null)

    useEffect(() => {
        const vars = {
            number: form.number,
            date: fmtInputDate(form.date),
            buyer: form.buyer,
            contact_name: contactName || "коллеги",
            manager_name: form.senderName,
            manager_phone: form.senderPhone,
            manager_email: form.senderEmail,
        }
        fetch("/api/crm/settings/proposal-email")
            .then(r => r.json())
            .then(d => {
                setSubject(fillTemplate(d.subject || "", vars))
                setMessage(fillTemplate(d.body || "", vars))
            })
            .catch(() => setError("Не удалось загрузить шаблон письма"))
            .finally(() => setLoading(false))

        fetch(`/api/crm/attachments?entityType=Deal&entityId=${dealId}`)
            .then(r => r.json())
            .then(d => setDealFiles(d.items || []))
            .catch(() => setDealFiles([]))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    function toggleDealFile(id) {
        setSelectedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]))
    }

    function onFilesPicked(e) {
        const picked = Array.from(e.target.files || [])
        e.target.value = ""
        if (!picked.length) return
        setExtraFiles(prev => [
            ...prev,
            // Один и тот же файл дважды в письмо не кладём.
            ...picked.filter(f => !prev.some(p => p.name === f.name && p.size === f.size)),
        ])
    }

    const extrasSize =
        dealFiles.reduce((s, f) => (selectedIds.includes(f.id) ? s + (f.size || 0) : s), 0) +
        extraFiles.reduce((s, f) => s + f.size, 0)
    const overLimit = extrasSize > MAX_MAIL_ATTACHMENTS_SIZE

    async function handleSend(e) {
        e.preventDefault()
        setError("")
        setSending(true)
        try {
            const payload = { to, subject, message, saveCopy, form, attachmentIds: selectedIds }
            const fd = new FormData()
            fd.append("payload", JSON.stringify(payload))
            for (const f of extraFiles) fd.append("file", f)
            const res = await fetch(`/api/crm/deals/${dealId}/proposal/send`, {
                method: "POST",
                body: fd,
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) {
                setError(data?.error || "Не удалось отправить письмо")
                return
            }
            toast.success(`Письмо отправлено на ${data.to}`, {
                title: "КП отправлено",
            })
            onSent?.()
            if (data.previewUrl) window.open(data.previewUrl, "_blank")
            onClose()
        } catch (err) {
            setError(err?.message || "Сбой сети")
        } finally {
            setSending(false)
        }
    }

    return (
        <div
            className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 print:hidden'
            onClick={onClose}
        >
            <div
                onClick={e => e.stopPropagation()}
                className='max-h-[92vh] w-full max-w-xl overflow-auto rounded-xl bg-white p-5 shadow-2xl'
            >
                <h2 className='mb-1 text-lg font-semibold text-neutral-900'>
                    Отправить КП на email
                </h2>
                <p className='mb-4 text-sm text-neutral-500'>
                    Вложение: {fileName}
                    {selectedIds.length + extraFiles.length > 0 &&
                        ` + ещё ${selectedIds.length + extraFiles.length}`}
                </p>

                {loading ? (
                    <p className='py-6 text-sm text-neutral-400'>Загрузка шаблона...</p>
                ) : (
                    <form onSubmit={handleSend} className='space-y-3'>
                        <div>
                            <label className='mb-1 block text-xs text-neutral-500'>Кому *</label>
                            <input
                                type='email'
                                required
                                value={to}
                                onChange={e => setTo(e.target.value)}
                                placeholder='client@example.ru'
                                className='w-full rounded-lg border border-line px-3 py-2 text-sm shadow-sm focus:border-brand_main focus:outline-none'
                            />
                        </div>
                        <div>
                            <label className='mb-1 block text-xs text-neutral-500'>Тема *</label>
                            <input
                                required
                                value={subject}
                                onChange={e => setSubject(e.target.value)}
                                className='w-full rounded-lg border border-line px-3 py-2 text-sm shadow-sm focus:border-brand_main focus:outline-none'
                            />
                        </div>
                        <div>
                            <label className='mb-1 block text-xs text-neutral-500'>
                                Текст письма *
                            </label>
                            <textarea
                                required
                                rows={10}
                                value={message}
                                onChange={e => setMessage(e.target.value)}
                                className='w-full rounded-lg border border-line px-3 py-2 text-sm shadow-sm focus:border-brand_main focus:outline-none'
                            />
                        </div>
                        <div className='rounded-lg border border-line p-3'>
                            <div className='mb-2 flex items-center justify-between gap-2'>
                                <p className='text-xs font-semibold uppercase tracking-wide text-neutral-500'>
                                    Дополнительные вложения
                                </p>
                                <button
                                    type='button'
                                    onClick={() => fileInputRef.current?.click()}
                                    className='inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1 text-xs text-neutral-700 transition hover:bg-surface_muted'
                                >
                                    <LuPaperclip className='h-3.5 w-3.5' />
                                    Загрузить файл
                                </button>
                                <input
                                    type='file'
                                    ref={fileInputRef}
                                    onChange={onFilesPicked}
                                    multiple
                                    className='hidden'
                                />
                            </div>

                            {dealFiles.length > 0 && (
                                <ul className='max-h-40 space-y-1 overflow-auto'>
                                    {dealFiles.map(att => (
                                        <li key={att.id}>
                                            <label className='flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-[13px] text-neutral-700 hover:bg-surface_muted'>
                                                <input
                                                    type='checkbox'
                                                    checked={selectedIds.includes(att.id)}
                                                    onChange={() => toggleDealFile(att.id)}
                                                    className='shrink-0 rounded accent-brand_main'
                                                />
                                                <span
                                                    className='min-w-0 flex-1 truncate'
                                                    title={att.fileName}
                                                >
                                                    {att.fileName}
                                                </span>
                                                <span className='shrink-0 text-[11px] text-neutral-400'>
                                                    {formatBytes(att.size)}
                                                </span>
                                            </label>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            {dealFiles.length === 0 && (
                                <p className='text-[13px] text-neutral-400'>
                                    В документах сделки пока пусто — файлы можно загрузить с
                                    компьютера.
                                </p>
                            )}

                            {extraFiles.length > 0 && (
                                <ul className='mt-2 space-y-1 border-t border-line pt-2'>
                                    {extraFiles.map((f, i) => (
                                        <li
                                            key={`${f.name}-${f.size}-${i}`}
                                            className='flex items-center gap-2 text-[13px] text-neutral-700'
                                        >
                                            <LuPaperclip className='h-3.5 w-3.5 shrink-0 text-neutral-400' />
                                            <span
                                                className='min-w-0 flex-1 truncate'
                                                title={f.name}
                                            >
                                                {f.name}
                                            </span>
                                            <span className='shrink-0 text-[11px] text-neutral-400'>
                                                {formatBytes(f.size)}
                                            </span>
                                            <button
                                                type='button'
                                                onClick={() =>
                                                    setExtraFiles(prev =>
                                                        prev.filter((_, idx) => idx !== i)
                                                    )
                                                }
                                                className='inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-neutral-400 transition hover:bg-red-50 hover:text-red-600'
                                                title='Убрать из письма'
                                            >
                                                <LuX className='h-3.5 w-3.5' />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}

                            <p
                                className={`mt-2 text-[11px] ${
                                    overLimit ? "text-red-600" : "text-neutral-400"
                                }`}
                            >
                                {extrasSize > 0
                                    ? `Выбрано ${formatBytes(extrasSize)} сверх PDF с КП. `
                                    : ""}
                                Лимит на письмо — {formatBytes(MAX_MAIL_ATTACHMENTS_SIZE)}.
                            </p>
                        </div>

                        <label className='inline-flex items-center gap-2 text-sm text-neutral-700'>
                            <input
                                type='checkbox'
                                checked={saveCopy}
                                onChange={e => setSaveCopy(e.target.checked)}
                                className='rounded accent-brand_main'
                            />
                            Сохранить копию PDF в документы сделки
                        </label>

                        {error && <p className='text-sm text-red-600'>{error}</p>}

                        <div className='flex justify-end gap-2'>
                            <button
                                type='button'
                                onClick={onClose}
                                className='rounded-lg border border-line px-4 py-2 text-sm text-neutral-700 hover:bg-surface_muted'
                            >
                                Отмена
                            </button>
                            <button
                                type='submit'
                                disabled={sending || overLimit}
                                className='inline-flex items-center gap-1.5 rounded-lg bg-brand_main px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand_main/90 disabled:opacity-60'
                            >
                                <LuMail className='h-4 w-4' />
                                {sending ? "Отправляем..." : "Отправить"}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    )
}

function Field({ label, children, action = null, className = "" }) {
    return (
        <div className={className}>
            <div className='mb-0.5 flex items-center justify-between gap-2'>
                <label className='block truncate text-[11px] text-neutral-500'>{label}</label>
                {action}
            </div>
            {children}
        </div>
    )
}

function Input(props) {
    return (
        <input
            {...props}
            className='w-full rounded-lg border border-line px-2.5 py-1.5 text-[13px] shadow-sm focus:border-brand_main focus:outline-none'
        />
    )
}
