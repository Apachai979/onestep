"use client"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { LuArrowLeftRight, LuAlertTriangle } from "react-icons/lu"
import { fieldLabel } from "@/lib/crm/change-log"
import { COUNTERPARTY_TYPE_LABELS, oppositeCounterpartyType } from "@/lib/crm/counterparty"
import { PROJECT_STATUS_LABELS } from "@/lib/crm/project"
import { Button, Modal, Spinner, useToast } from "@/components/crm/ui"

// Смена роли контрагента: конечный потребитель ↔ дистрибьютор.
// Перед подтверждением показываем, что уже связано с карточкой в текущей роли —
// эти связи сохранятся, но роль в них перестанет совпадать с типом карточки.
export default function CounterpartyTypeSwitch({ id, name, type }) {
    const router = useRouter()
    const toast = useToast()
    const [open, setOpen] = useState(false)
    const [preview, setPreview] = useState(null)
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState("")

    const targetType = oppositeCounterpartyType(type)
    const targetLabel = COUNTERPARTY_TYPE_LABELS[targetType]

    async function openDialog() {
        setOpen(true)
        setError("")
        setPreview(null)
        setLoading(true)
        try {
            const r = await fetch(`/api/crm/counterparties/${id}/convert`)
            const data = await r.json().catch(() => ({}))
            if (!r.ok) throw new Error(data.error || `Ошибка ${r.status}`)
            setPreview(data)
        } catch (err) {
            setError(err.message || "Не удалось загрузить данные")
        } finally {
            setLoading(false)
        }
    }

    async function handleConfirm() {
        setSaving(true)
        setError("")
        try {
            const r = await fetch(`/api/crm/counterparties/${id}/convert`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ targetType }),
            })
            const data = await r.json().catch(() => ({}))
            if (!r.ok) throw new Error(data.error || `Ошибка ${r.status}`)
            setOpen(false)
            toast.success(`«${name}» теперь ${targetLabel.toLowerCase()}`)
            router.refresh()
        } catch (err) {
            setError(err.message || "Не удалось сменить тип")
        } finally {
            setSaving(false)
        }
    }

    const links = preview?.links
    const hasLinks =
        links && (links.projectsCount > 0 || links.tasksCount > 0 || links.auctionDealsCount > 0)

    return (
        <>
            <Button
                variant='secondary'
                size='sm'
                onClick={openDialog}
                title={`Сменить тип на «${targetLabel}»`}
            >
                <LuArrowLeftRight className='h-3.5 w-3.5' />
                Сделать {targetType === "DISTRIBUTOR" ? "дистрибьютором" : "потребителем"}
            </Button>

            <Modal
                open={open}
                onClose={saving ? undefined : () => setOpen(false)}
                title='Смена типа контрагента'
                description={`«${name}»: ${COUNTERPARTY_TYPE_LABELS[type]} → ${targetLabel}`}
                size='lg'
                footer={
                    <>
                        <Button
                            variant='secondary'
                            onClick={() => setOpen(false)}
                            disabled={saving}
                        >
                            Отмена
                        </Button>
                        <Button
                            onClick={handleConfirm}
                            loading={saving}
                            disabled={loading || !preview}
                        >
                            Сменить тип
                        </Button>
                    </>
                }
            >
                {loading && (
                    <div className='flex items-center gap-2 text-sm text-neutral-500'>
                        <Spinner size='sm' />
                        Проверяем связи...
                    </div>
                )}

                {!loading && preview && (
                    <div className='space-y-3 text-sm text-neutral-700'>
                        <p>
                            Карточка переедет в раздел{" "}
                            <span className='font-medium text-neutral-900'>
                                {targetType === "DISTRIBUTOR"
                                    ? "«Дистрибьюторы»"
                                    : "«Конечные потребители»"}
                            </span>
                            . Реквизиты, контакты, сделки, заметки и файлы останутся на месте.
                        </p>

                        {preview.clearedFields?.length > 0 && (
                            <p className='rounded-xl border border-line bg-surface_muted p-3'>
                                Будут очищены поля, которые есть только у конечного
                                потребителя:{" "}
                                <span className='font-medium text-neutral-900'>
                                    {preview.clearedFields
                                        .map(f => fieldLabel("Counterparty", f))
                                        .join(", ")}
                                </span>
                                .
                            </p>
                        )}

                        {hasLinks && (
                            <div className='rounded-xl border border-amber-300 bg-amber-50 p-3 text-amber-900'>
                                <p className='flex items-center gap-2 font-semibold'>
                                    <LuAlertTriangle className='h-4 w-4 shrink-0' />
                                    Контрагент уже участвует как «
                                    {COUNTERPARTY_TYPE_LABELS[type].toLowerCase()}»
                                </p>
                                <ul className='mt-2 list-inside list-disc space-y-0.5 text-[13px]'>
                                    {links.projectsCount > 0 && (
                                        <li>Проектов: {links.projectsCount}</li>
                                    )}
                                    {links.tasksCount > 0 && <li>Задач: {links.tasksCount}</li>}
                                    {links.auctionDealsCount > 0 && (
                                        <li>
                                            Сделок, где он заказчик аукциона:{" "}
                                            {links.auctionDealsCount}
                                        </li>
                                    )}
                                </ul>
                                {links.projects?.length > 0 && (
                                    <ul className='mt-2 space-y-0.5 text-[13px]'>
                                        {links.projects.map(p => (
                                            <li key={p.id} className='truncate'>
                                                {p.internalName}
                                                <span className='text-amber-700'>
                                                    {" · "}
                                                    {PROJECT_STATUS_LABELS[p.status] || p.status}
                                                </span>
                                            </li>
                                        ))}
                                        {links.projectsCount > links.projects.length && (
                                            <li className='text-amber-700'>
                                                и ещё {links.projectsCount - links.projects.length}
                                                ...
                                            </li>
                                        )}
                                    </ul>
                                )}
                                <p className='mt-2 text-[13px]'>
                                    Эти записи сохранятся и останутся видны в карточке — менять
                                    их вручную не нужно. Новые проекты и задачи можно будет
                                    создавать только в новой роли.
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {error && (
                    <p className='mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700'>
                        {error}
                    </p>
                )}
            </Modal>
        </>
    )
}
