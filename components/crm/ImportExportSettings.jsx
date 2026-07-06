"use client"
import { useRef, useState } from "react"
import { LuDownload, LuUpload } from "react-icons/lu"
import { useToast } from "@/components/crm/ui"

const ENTITIES = [
    { key: "counterparties", label: "Контрагенты", hint: "+ лист «Контакты»" },
    { key: "deals", label: "Сделки", hint: "+ лист «Позиции»" },
    { key: "projects", label: "Проекты", hint: "+ лист «Позиции»" },
]

export default function ImportExportSettings() {
    const toast = useToast()
    const fileRef = useRef(null)
    const [entity, setEntity] = useState("counterparties")
    const [importing, setImporting] = useState(false)
    const [report, setReport] = useState(null)

    async function handleImport(e) {
        const file = e.target.files?.[0]
        e.target.value = ""
        if (!file) return
        setImporting(true)
        setReport(null)
        try {
            const form = new FormData()
            form.append("file", file)
            const r = await fetch(`/api/crm/import/${entity}`, {
                method: "POST",
                body: form,
            })
            const data = await r.json().catch(() => ({}))
            if (!r.ok) {
                toast.error(data?.error || "Импорт не удался")
                return
            }
            setReport(data)
            toast.success(
                `Создано: ${data.created}${data.skipped ? `, пропущено дублей: ${data.skipped}` : ""}`,
                { title: "Импорт завершён" },
            )
        } catch (err) {
            toast.error(err?.message || "Сбой сети")
        } finally {
            setImporting(false)
        }
    }

    return (
        <section className='rounded-xl border border-brand_soft/40 bg-white/70 p-5'>
            <h2 className='text-sm font-semibold uppercase tracking-wide text-gray-500'>
                Импорт и экспорт (Excel)
            </h2>
            <p className='mt-1 text-sm text-night_green/60'>
                Для переезда с другой CRM и резервных копий. Формат импорта совпадает
                с форматом экспорта — выгрузите текущий список, чтобы получить образец
                файла. Порядок переезда: сначала контрагенты, затем сделки и проекты.
            </p>

            {/* Экспорт */}
            <div className='mt-4'>
                <p className='mb-2 text-xs font-semibold uppercase tracking-wide text-night_green/50'>
                    Экспорт
                </p>
                <div className='flex flex-wrap gap-2'>
                    {ENTITIES.map(e => (
                        <a
                            key={e.key}
                            href={`/api/crm/export/${e.key}`}
                            className='inline-flex items-center gap-2 rounded-lg border border-brand_soft/60 bg-white px-4 py-2 text-sm text-gray-700 shadow-sm transition hover:bg-brand_soft/20'
                            title={e.hint}
                        >
                            <LuDownload className='h-4 w-4 text-brand_main' />
                            {e.label}
                        </a>
                    ))}
                </div>
            </div>

            {/* Импорт */}
            <div className='mt-5'>
                <p className='mb-2 text-xs font-semibold uppercase tracking-wide text-night_green/50'>
                    Импорт
                </p>
                <div className='flex flex-wrap items-center gap-2'>
                    <select
                        value={entity}
                        onChange={e => setEntity(e.target.value)}
                        className='rounded-lg border border-brand_soft/60 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand_main focus:outline-none'
                    >
                        {ENTITIES.map(e => (
                            <option key={e.key} value={e.key}>
                                {e.label}
                            </option>
                        ))}
                    </select>
                    <button
                        type='button'
                        disabled={importing}
                        onClick={() => fileRef.current?.click()}
                        className='inline-flex items-center gap-2 rounded-lg bg-brand_main px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand_main/90 disabled:opacity-60'
                    >
                        <LuUpload className='h-4 w-4' />
                        {importing ? "Импортируем..." : "Выбрать файл .xlsx"}
                    </button>
                    <input
                        ref={fileRef}
                        type='file'
                        accept='.xlsx'
                        onChange={handleImport}
                        className='hidden'
                    />
                </div>
                <p className='mt-2 text-xs text-night_green/55'>
                    Контрагенты сверяются по ИНН и названию — дубли пропускаются.
                    Сделки и проекты привязываются к контрагентам по ИНН/названию,
                    менеджеры — по email (иначе назначаетесь вы). При ошибке файл
                    откатывается целиком.
                </p>

                {report && (
                    <div className='mt-3 rounded-lg bg-brand_soft/15 p-3 text-sm text-night_green/80'>
                        <p>
                            Создано: <b>{report.created}</b>
                            {report.skipped > 0 && <> · пропущено дублей: <b>{report.skipped}</b></>}
                            {report.contacts > 0 && <> · контактов: <b>{report.contacts}</b></>}
                            {report.items > 0 && <> · позиций: <b>{report.items}</b></>}
                        </p>
                        {report.errors?.length > 0 && (
                            <div className='mt-2'>
                                <p className='font-semibold text-red-700'>
                                    Пропущено строк с ошибками: {report.errors.length}
                                </p>
                                <ul className='mt-1 max-h-48 list-inside list-disc space-y-0.5 overflow-y-auto text-xs text-red-700/90'>
                                    {report.errors.map((e, i) => (
                                        <li key={i}>
                                            Лист «{e.sheet}», строка {e.row}: {e.message}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </section>
    )
}
