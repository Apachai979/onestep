"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { LuTrash2 } from "react-icons/lu"
import { Button, useConfirm, useToast } from "@/components/crm/ui"

/**
 * Кнопка удаления карточки (проект, сделка) — только для администратора,
 * решение о доступности принимает страница.
 *
 * url        — эндпоинт DELETE
 * redirectTo — куда уходим после удаления
 * name       — название карточки, показываем в подтверждении
 * consequences — что уедет вместе с карточкой (список строк)
 */
export default function DeleteEntityButton({
    url,
    redirectTo,
    title = "Удалить карточку?",
    name,
    consequences = [],
    successText = "Удалено",
    label = "Удалить",
}) {
    const router = useRouter()
    const toast = useToast()
    const confirm = useConfirm()
    const [loading, setLoading] = useState(false)

    async function handleClick() {
        const lines = [name, ...consequences, "Действие нельзя отменить."].filter(Boolean)
        const ok = await confirm({
            title,
            description: lines.join("\n"),
            confirmText: "Удалить",
            variant: "danger",
        })
        if (!ok) return

        setLoading(true)
        const res = await fetch(url, { method: "DELETE" })
        if (!res.ok) {
            const data = await res.json().catch(() => ({}))
            toast.error(data.error || "Не удалось удалить")
            setLoading(false)
            return
        }
        toast.success(successText)
        router.push(redirectTo)
        router.refresh()
    }

    return (
        <Button
            type='button'
            variant='danger_soft'
            size='sm'
            loading={loading}
            onClick={handleClick}
            className='shrink-0'
        >
            {!loading && <LuTrash2 className='h-3.5 w-3.5' />}
            {label}
        </Button>
    )
}
