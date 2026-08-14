// Доска аукционов: колонки — не статусы сделки, а близость даты торгов.
//
// Статус сделки отвечает на вопрос «на какой стадии продажа», а менеджеру по
// госзакупкам нужен ответ на другой вопрос — «когда разыграется». Это разные
// оси, поэтому отдельного статуса «Аукцион» в воронке нет: доска раскладывает
// те же аукционные сделки (Deal.isAuction) по календарю.
//
// Карточка переезжает между колонками сама, по мере приближения даты, — поэтому
// перетаскивания здесь нет: «перенести» карточку означало бы сдвинуть срок
// закупки, чего мышью делать нельзя.
//
// Раскладка идёт по окончанию приёма заявок: на практике торги проводят сразу
// после него, и менеджеру важен именно этот срок. Дата торгов — запасной
// вариант для карточек, где заполнена только она.

import { crmYmd, daysBetweenYmd } from "./datetime"

// Порог «Скоро» — в календарных сутках зоны CRM, а не в 24-часовых интервалах:
// «завтра в 9:00» должно попадать в «Скоро» и в 8 утра, и в 8 вечера.
export const AUCTION_SOON_DAYS = 3

// Сколько дней карточка с зафиксированным итогом ещё висит в «Прошли».
export const AUCTION_PASSED_KEEP_DAYS = 7

// Статусы, в которых аукцион живёт до торгов и пока итог не известен: состав
// заявки могли согласовать с клиентом заранее, поэтому «Согласовано / Позиции»
// — такая же дотроговая стадия, как «Переговоры / КП». Выигрыш — это движение
// дальше по воронке, проигрыш — «Не реализована» с причиной (DEAL_LOSS_REASONS).
export const AUCTION_PENDING_STATUSES = ["NEGOTIATION", "CONFIRMED"]

// Исполненной сделке на доске аукционов делать нечего: закупка отработана, а
// архив — свалка старых отказов.
export const AUCTION_HIDDEN_STATUSES = ["CLOSED", "ARCHIVED"]

// Сколько карточек грузим в одну колонку; полное количество и сумма НМЦК по
// колонке приходят отдельными числами — как на доске сделок.
export const AUCTION_BOARD_PER_COLUMN = 50

export const AUCTION_COLUMNS = [
    {
        key: "NO_DATE",
        label: "Без даты",
        hint: "Срок закупки не заполнен",
        accent: "bg-neutral-300/70",
        badge: "bg-neutral-100 text-neutral-600",
    },
    {
        key: "UPCOMING",
        label: "Предстоящие",
        hint: `Больше ${AUCTION_SOON_DAYS} дней`,
        accent: "bg-sky-300/70",
        badge: "bg-sky-50 text-sky-700",
    },
    {
        key: "SOON",
        label: "Скоро",
        hint: `Ближайшие ${AUCTION_SOON_DAYS} дня`,
        accent: "bg-amber-300/70",
        badge: "bg-amber-50 text-amber-700",
    },
    {
        key: "TODAY",
        label: "Сегодня",
        hint: "Разыгрывается сегодня",
        accent: "bg-orange-400/70",
        badge: "bg-orange-50 text-orange-700",
    },
    {
        key: "PASSED",
        label: "Прошли",
        hint: "Зафиксируйте результат",
        accent: "bg-neutral-400/70",
        badge: "bg-neutral-100 text-neutral-600",
    },
]

export const AUCTION_COLUMN_KEYS = AUCTION_COLUMNS.map(c => c.key)

/** Срок, по которому карточка раскладывается: приём заявок, иначе торги. */
export function auctionBoardDate(deal) {
    return deal?.bidsDeadlineAt ?? deal?.auctionAt ?? null
}

/** Сколько суток до срока: 0 — сегодня, отрицательное — срок прошёл. */
export function auctionDaysLeft(deal, today) {
    const date = auctionBoardDate(deal)
    if (!date || !today) return null
    const ymd = crmYmd(date)
    if (!ymd) return null
    return daysBetweenYmd(today, ymd)
}

export function auctionBoardColumn(deal, today) {
    const days = auctionDaysLeft(deal, today)
    if (days === null) return "NO_DATE"
    if (days < 0) return "PASSED"
    if (days === 0) return "TODAY"
    if (days <= AUCTION_SOON_DAYS) return "SOON"
    return "UPCOMING"
}

/** Итог не зафиксирован: торги прошли, а сделка так и стоит на дотроговой стадии. */
export function auctionResultPending(deal) {
    return AUCTION_PENDING_STATUSES.includes(deal?.status)
}

// Карточка с зафиксированным итогом висит в «Прошли» ещё неделю — посмотреть
// свежие результаты — и уходит. Без итога не уходит никогда: доска работает как
// контрольный список, иначе аукцион молча исчезал бы, а выиграли мы или нет —
// так и осталось бы неизвестным.
export function isOnAuctionBoard(deal, today) {
    if (!deal?.isAuction) return false
    if (AUCTION_HIDDEN_STATUSES.includes(deal.status)) return false
    const days = auctionDaysLeft(deal, today)
    if (days === null || days >= 0) return true
    if (auctionResultPending(deal)) return true
    return -days <= AUCTION_PASSED_KEEP_DAYS
}

// Прошедший аукцион без итога дольше недели — это уже не «ждём протокол», а
// забытая карточка: на доске подсвечиваем её отдельно.
export function auctionResultOverdue(deal, today) {
    if (!auctionResultPending(deal)) return false
    const days = auctionDaysLeft(deal, today)
    return days !== null && -days > AUCTION_PASSED_KEEP_DAYS
}

// Итог прошедших торгов — по статусу сделки, а не по заполненному `winner`:
// при выигрыше победитель это мы сами, и своё же юрлицо в поле «Победитель»
// никто не вписывает. Поле хранит того, кто забрал закупку, когда проиграли, —
// на доске оно идёт подписью, а не признаком.
//
// «Аукцион отменён» отделён от проигрыша намеренно: закупку сняли, мы никому не
// уступили, и красить такую карточку как поражение значило бы врать глазу.
export function auctionOutcome(deal) {
    if (auctionResultPending(deal)) return null
    if (deal?.status === "CANCELLED") {
        return deal.lossReason === "AUCTION_CANCELLED" ? "VOID" : "LOST"
    }
    return "WON"
}

// Итог показываем только у прошедших торгов: сделку могли двинуть по воронке и
// до них (перенесли дату, работают по другому контракту) — красить такую
// карточку «выиграли» рано.
export function auctionBoardOutcome(deal, today) {
    const days = auctionDaysLeft(deal, today)
    if (days === null || days >= 0) return null
    return auctionOutcome(deal)
}

function pluralDays(n) {
    const mod100 = n % 100
    if (mod100 >= 11 && mod100 <= 14) return "дней"
    const mod10 = n % 10
    if (mod10 === 1) return "день"
    if (mod10 >= 2 && mod10 <= 4) return "дня"
    return "дней"
}

/** Человеческий отсчёт до срока: «через 3 дня», «сегодня», «5 дней назад». */
export function auctionDueLabel(deal, today) {
    const days = auctionDaysLeft(deal, today)
    if (days === null) return "срок не указан"
    if (days === 0) return "сегодня"
    if (days === 1) return "завтра"
    if (days === -1) return "вчера"
    if (days > 0) return `через ${days} ${pluralDays(days)}`
    return `${-days} ${pluralDays(-days)} назад`
}

// Внутри колонки — по сроку. В будущих колонках ближайшие сверху, в «Прошли»
// наоборот: свежие торги интереснее давних, а давние там уже разобраны.
// Карточки без срока сортируются по дате создания.
export function sortAuctionColumn(items, key) {
    const dir = key === "PASSED" ? -1 : 1
    return [...items].sort((a, b) => {
        const da = auctionBoardDate(a)
        const db = auctionBoardDate(b)
        if (!da && !db) return new Date(b.createdAt) - new Date(a.createdAt)
        if (!da) return 1
        if (!db) return -1
        return (new Date(da) - new Date(db)) * dir
    })
}

// Чистая сборка доски: на вход — уже отфильтрованные аукционные сделки.
// sum считается по НМЦК, а не по сумме сделки: до торгов сумму нашей заявки
// часто ещё не проставили, а начальная цена закупки известна всегда.
export function buildAuctionBoard(deals, { today, perColumn = AUCTION_BOARD_PER_COLUMN } = {}) {
    const columns = Object.fromEntries(
        AUCTION_COLUMN_KEYS.map(k => [k, { items: [], total: 0, sum: 0 }]),
    )

    for (const deal of deals) {
        if (!isOnAuctionBoard(deal, today)) continue
        const column = columns[auctionBoardColumn(deal, today)]
        if (!column) continue
        column.items.push(deal)
        column.total += 1
        column.sum += Number(deal.nmck) || 0
    }

    for (const key of AUCTION_COLUMN_KEYS) {
        columns[key].items = sortAuctionColumn(columns[key].items, key).slice(0, perColumn)
    }

    return columns
}
