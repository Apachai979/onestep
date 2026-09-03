"use client"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { LuCheck, LuLock, LuPencil, LuX } from "react-icons/lu"
import { formatMoney, formatPercent } from "@/lib/crm/format"
import { useToast } from "@/components/crm/ui"

// Скидку правят чаще прочих полей карточки: в сделке — обычно перед
// формированием КП (кнопка «Сформировать КП» стоит на той же карточке), в
// проекте — по итогам разговора с клиентом, до того как по нему заведут сделки.
// Ради одного числа открывать форму всей карточки не нужно, поэтому значение
// редактируется прямо в строке «Скидка»; поля в формах при этом остались —
// скидка, как и статус, правится из двух мест.
//
// Автосохранения нет намеренно: в отличие от статуса, у скидки свободный ввод,
// и сохранение по blur молча меняло бы суммы от случайного скролла над
// number-полем. Правка фиксируется явно — Enter или галочкой, Esc отменяет.
// Скидки в CRM целые (15, 20, 30 %) — стрелки поля шагают по единице, дробное
// значение контрол не принимает.
//
// Блокировки повторяют серверные (PATCH всё равно ответит 403 —
// dealLockResponse / projectLockResponse и DEAL_DISCOUNT_SHIPPED_ERROR); здесь
// мы лишь не предлагаем того, что сервер не примет:
//   readOnly   — карточка завершена и доступна только для просмотра;
//   lockedHint — правку закрывает своя причина (у сделки — проведённая
//                отгрузка), её текст показывается подсказкой у замочка.
export default function InlineDiscountControl({
    // PATCH-роут карточки: /api/crm/deals/<id> или /api/crm/projects/<id>.
    url,
    initialValue,
    // Сумма, от которой считается «сколько это в рублях». Есть только у сделки:
    // у проекта своей суммы нет, там показываем один процент.
    totalAmount = null,
    // Чем подписать пустое значение: у проекта это не прочерк, а объяснение,
    // откуда сделки возьмут скидку.
    emptyLabel = "—",
    // Что карточка унаследовала бы по цепочке (см. lib/crm/discount.js):
    // значение и подпись источника. Нужны только подсказкой под полем.
    inheritedValue = null,
    inheritedLabel = null,
    // Куда значение пойдёт дальше — «Используется в КП» и т.п.
    usageHint = null,
    readOnly = false,
    lockedHint = null,
}) {
    const router = useRouter()
    const toast = useToast()
    const [value, setValue] = useState(initialValue ?? null)
    const [editing, setEditing] = useState(false)
    const [draft, setDraft] = useState("")
    const [saving, setSaving] = useState(false)

    const locked = readOnly || Boolean(lockedHint)
    const pct = value === null || value === "" ? null : Number(value)
    const amount =
        pct === null || totalAmount === null ? null : ((Number(totalAmount) || 0) * pct) / 100

    function start() {
        setDraft(pct === null ? "" : String(pct))
        setEditing(true)
    }

    async function save(e) {
        e.preventDefault()
        const str = draft.replace(",", ".").trim()
        // Сравниваем до проверки: значение могло остаться прежним, и ругаться
        // на него, когда менеджер ничего не менял, незачем.
        if ((str === "" ? null : Number(str)) === pct) {
            setEditing(false)
            return
        }
        // Пустое поле — «скидки нет», это осмысленное значение, а не ошибка.
        let next = null
        if (str !== "") {
            if (!/^\d+$/.test(str) || Number(str) > 100) {
                toast.error("Скидка: введите целое число от 0 до 100")
                return
            }
            next = str
        }

        setSaving(true)
        const res = await fetch(url, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ discount: next }),
        })
        if (res.ok) {
            setValue(next)
            setEditing(false)
            toast.success(next === null ? "Скидка снята" : "Скидка обновлена")
            // От скидки считаются соседние строки карточки («Сумма со скидкой»,
            // суммы сделок проекта) — перерисовываем её целиком.
            router.refresh()
        } else {
            const d = await res.json().catch(() => ({}))
            toast.error(d.error || "Не удалось изменить скидку")
        }
        setSaving(false)
    }

    if (editing) {
        const inheritedPct =
            inheritedValue === null || inheritedValue === "" ? null : Number(inheritedValue)
        const inheritedHint =
            inheritedPct === null || !inheritedLabel
                ? null
                : inheritedPct === pct
                  ? `Подставлена ${inheritedLabel}.`
                  : `${formatPercent(inheritedPct)} ${inheritedLabel}.`
        const hint = [inheritedHint, usageHint].filter(Boolean).join(" ")

        return (
            <form onSubmit={save} noValidate className='space-y-1'>
                <div className='flex items-center gap-1'>
                    <input
                        type='number'
                        min='0'
                        max='100'
                        step='1'
                        inputMode='numeric'
                        autoFocus
                        disabled={saving}
                        value={draft}
                        onChange={e => setDraft(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === "Escape") setEditing(false)
                        }}
                        aria-label='Скидка, %'
                        className='h-8 w-20 rounded-lg border border-line bg-white px-2 text-sm text-neutral-900 shadow-sm transition-all duration-200 focus:border-brand_main focus:outline-none focus:ring-2 focus:ring-brand_main/20 disabled:bg-surface_muted'
                    />
                    <span className='text-sm text-neutral-400'>%</span>
                    <button
                        type='submit'
                        disabled={saving}
                        title='Сохранить'
                        aria-label='Сохранить скидку'
                        className='inline-flex h-7 w-7 items-center justify-center rounded-lg text-brand_main transition hover:bg-neutral-100 disabled:opacity-50'
                    >
                        <LuCheck className='h-4 w-4' />
                    </button>
                    <button
                        type='button'
                        disabled={saving}
                        onClick={() => setEditing(false)}
                        title='Отмена'
                        aria-label='Отменить правку скидки'
                        className='inline-flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700 disabled:opacity-50'
                    >
                        <LuX className='h-4 w-4' />
                    </button>
                </div>
                {hint && <p className='text-[11px] leading-tight text-neutral-400'>{hint}</p>}
            </form>
        )
    }

    return (
        <div className='flex items-center gap-1.5'>
            {pct === null ? (
                <span className='text-neutral-400'>{emptyLabel}</span>
            ) : (
                <span>
                    {formatPercent(pct)}
                    {amount === null ? "" : ` (${formatMoney(amount)})`}
                </span>
            )}
            {lockedHint && !readOnly && (
                <span title={lockedHint} className='text-neutral-300'>
                    <LuLock className='h-3 w-3' aria-label='Скидка зафиксирована' />
                </span>
            )}
            {!locked && (
                <button
                    type='button'
                    onClick={start}
                    title='Изменить скидку'
                    aria-label='Изменить скидку'
                    className='inline-flex h-6 w-6 items-center justify-center rounded-md text-neutral-300 transition hover:bg-neutral-100 hover:text-neutral-700'
                >
                    <LuPencil className='h-3 w-3' />
                </button>
            )}
        </div>
    )
}
