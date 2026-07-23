import path from "path"
import {
    Document,
    Font,
    Image,
    Page,
    StyleSheet,
    Text,
    View,
    renderToBuffer,
} from "@react-pdf/renderer"

// ============================================================================
// ШПАРГАЛКА ДЛЯ ПРАВОК
// ============================================================================
// Единицы:
//   - Без суффикса (fontSize: 9, padding: 4) — это point (pt). 1pt ≈ 0.35мм.
//   - Строки со «mm»/«%»/«pt» — используются как есть.
//   - A4 = 595pt × 842pt = 210мм × 297мм.
// Полезные ориентиры:
//   - Тело письма — 9pt, мелкий шрифт (состав) — 7pt, заголовок — 12pt.
//   - Обычные отступы между блоками — 8–14pt.
//   - Внутри ячейки таблицы padding 4pt = разумный минимум.
// fontWeight:
//   - 400 — обычный (Regular),
//   - 600 — полужирный (SemiBold, константа SEMI ниже),
//   - 700 — жирный (Bold).
//   - Отдельно есть italic (для fontStyle: "italic", тоже 400 weight).
// Как править «на глаз»:
//   1. Меняешь число в стиле → npm run dev → «Сохранить в сделку» → смотришь.
//   2. Обычно достаточно менять fontSize, marginTop/marginBottom, padding.
//   3. lineHeight — множитель к размеру шрифта: 1 = «плотно», 1.5 = «воздушно».
// ============================================================================

// Кириллический шрифт. Файлы лежат в /public/fonts/, читаем прямо из ФС —
// работает и в dev, и в production (файлы попадают в бандл через public/).
// Если нужно другое начертание (Medium 500, ExtraBold 800...) — качаем TTF,
// кладём в /public/fonts/ и добавляем сюда ещё один объект.
Font.register({
    family: "Noto Sans",
    fonts: [
        {
            src: path.join(process.cwd(), "public/fonts/NotoSans-Regular.ttf"),
            fontWeight: 400,
        },
        {
            src: path.join(process.cwd(), "public/fonts/NotoSans-SemiBold.ttf"),
            fontWeight: 600,
        },
        {
            src: path.join(process.cwd(), "public/fonts/NotoSans-Bold.ttf"),
            fontWeight: 700,
        },
        {
            src: path.join(process.cwd(), "public/fonts/NotoSans-Italic.ttf"),
            fontWeight: 400,
            fontStyle: "italic",
        },
    ],
})

// Константы, которые используются в нескольких местах — правь тут, если хочешь
// изменить сразу по всему документу.
const BORDER = "#555" // цвет линий таблицы и блока итогов
const BORDER_W = 0.75 // толщина линий (в pt). 0.5 = очень тонко, 1 = чётче
const MUTED = "#666" // «блёклый» серый — для лейблов, дисклеймера
const SEMI = 600 // семантический алиас для полужирного веса

const s = StyleSheet.create({
    // ========================================================================
    // СТРАНИЦА (A4). Задаёт поля и базовые параметры шрифта — их наследуют
    // все дочерние элементы (пока явно не переопределены).
    // ========================================================================
    page: {
        paddingTop: "12mm", // отступ от верха листа
        paddingBottom: "14mm", // отступ от низа листа (подвал/подпись не упирались)
        paddingHorizontal: "12mm", // отступ слева и справа
        fontFamily: "Noto Sans", // базовый шрифт документа
        fontSize: 9, // размер основного текста
        color: "#000", // цвет основного текста
        lineHeight: 1.0, // межстрочный интервал (1 = плотно, 1.5 = воздушно)
    },

    // ========================================================================
    // ШАПКА ДОКУМЕНТА (логотип слева + адрес компании справа).
    // Помечена fixed — повторяется на каждой странице.
    // ========================================================================
    header: {
        flexDirection: "row", // логотип и адрес в одну строку
        justifyContent: "space-between", // логотип к левому краю, адрес — к правому
        alignItems: "flex-start", // выравнивание по верху
        paddingBottom: 8, // «воздух» перед разделительной линией
        marginBottom: 12, // отступ до заголовка КП
        borderBottomWidth: 0.6, // толщина серой линии под шапкой
        borderBottomColor: "#e5e5e5", // цвет линии (светло-серый)
    },
    // Логотип OneStep. Размеры в pt.
    logo: {
        width: 110, // ширина
        height: 40, // высота (соотношение сторон 2.75:1)
        objectFit: "contain", // не растягивать/обрезать
    },
    // Адрес и контакты справа от логотипа. Мелкий шрифт для компактности.
    sellerAddr: {
        flex: 1, // растянуть блок на всё место справа от логотипа —
        // без этого блок узкий (по самой длинной строке),
        // и textAlign:right не «дотягивает» до края листа
        fontSize: 8, // мельче основного, чтобы не перебивать заголовок
        textAlign: "right", // прижать текст к правому краю
        color: "#333", // почти чёрный, но чуть мягче основного
        lineHeight: 1.3, // немного воздуха между строками адреса
    },

    // ========================================================================
    // ЗАГОЛОВОК «Коммерческое предложение № … от …»
    // ========================================================================
    title: {
        fontSize: 12, // самый крупный шрифт в документе
        fontWeight: SEMI, // полужирный (не bold — bold смотрится тяжеловато)
        textAlign: "center",
        marginTop: 4, // небольшой отступ от шапки
    },
    // Подзаголовок «действительно N рабочих дней»
    subtitle: {
        fontSize: 9,
        fontStyle: "italic",
        textAlign: "center",
        color: MUTED, // сероватый — не отвлекает от заголовка
        marginTop: 7, // подпись сразу под заголовком
    },

    // ========================================================================
    // БЛОК ПАРАМЕТРОВ (Покупатель / Срок поставки / Условия оплаты / поставки)
    // ========================================================================
    paramsBlock: {
        marginTop: 14, // отступ от подзаголовка
        marginBottom: 4, // отступ до вступительной фразы
    },
    paramRow: {
        flexDirection: "row",
        marginBottom: 3, // расстояние между строками параметров
    },
    paramLabel: {
        color: MUTED, // «Покупатель:» — серым
        marginRight: 5, // отступ до значения
    },
    paramValue: {
        flexShrink: 1, // длинное значение переносится, не выпирает за поля
        // Если захочешь выделить значения (сделать полужирными) — добавь:
        //   fontWeight: SEMI,
    },

    // ========================================================================
    // ВСТУПИТЕЛЬНЫЙ АБЗАЦ («Компания ООО …предлагает вашему вниманию…»)
    // ========================================================================
    intro: {
        fontSize: 10,
        marginTop: 9, // отступ от блока параметров
        marginBottom: 9, // отступ до таблицы
        lineHeight: 1.35, // плотный межстрочный (обычно вписывается в 1-2 строки)
    },

    // ========================================================================
    // ТАБЛИЦА ТОВАРОВ
    // Правило рисования границ, чтобы линии не задваивались:
    //   - Контейнер (table) даёт top + left.
    //   - Каждая ячейка (th, td) даёт bottom + right.
    // Итого рамка целая, ни один пиксель не пересекается дважды.
    // ========================================================================
    table: {
        borderTopWidth: BORDER_W,
        borderLeftWidth: BORDER_W,
        borderColor: BORDER,
    },
    // Строка шапки таблицы (fixed — повторяется на каждой странице документа).
    thead: {
        flexDirection: "row",
        backgroundColor: "#f2f2f2", // серый фон, выделяет шапку. "#fff" уберёт фон.
    },
    // Строка тела таблицы (одна на позицию товара).
    row: {
        flexDirection: "row",
    },
    // Ячейка шапки — сам заголовок колонки («№», «Артикул», ...)
    th: {
        padding: 4, // внутренние отступы (со всех сторон)
        borderRightWidth: BORDER_W,
        borderBottomWidth: BORDER_W,
        borderColor: BORDER,
        fontWeight: SEMI, // полужирный
        fontSize: 8, // мельче основного текста — оптимально для шапок
        textAlign: "center", // заголовок колонки по центру
    },
    // Ячейка тела таблицы (общие свойства; специфика — в tdNum / tdRight ниже)
    td: {
        padding: 4,
        borderRightWidth: BORDER_W,
        borderBottomWidth: BORDER_W,
        borderColor: BORDER,
        fontSize: 8,
    },
    // Дополнительный модификатор: содержимое ячейки по центру (например, «№»)
    tdNum: { textAlign: "center" },
    // Дополнительный модификатор: содержимое ячейки справа (для чисел/сумм)
    tdRight: { textAlign: "right" },
    // Название товара внутри ячейки (крупнее и полужирнее, чем состав)
    itemName: {
        fontWeight: SEMI, // выделить название среди состава
        fontSize: 8, // чуть крупнее общего 8pt в таблице
    },
    // Состав набора (мелкий текст под названием товара)
    contents: {
        fontSize: 7, // самый мелкий шрифт в таблице
        color: "#555", // серый, чтобы не отвлекал от главного
        marginTop: 2, // отступ между названием и составом
        lineHeight: 1.3, // небольшой воздух между строками состава
    },

    // ========================================================================
    // БЛОК ИТОГОВ (правая колонка: ИТОГО / Скидка / Сумма скидки / НДС ...)
    // ========================================================================
    // Контейнер блока — прижат к правому краю, фиксированная ширина.
    totalsBox: {
        alignSelf: "flex-end", // прижать к правому краю страницы
        marginTop: 8, // отступ от таблицы товаров
        width: 260, // ширина блока в pt (~91мм). Меняй под содержимое.
    },
    totalsRow: {
        flexDirection: "row", // лейбл + значение в одну строку
    },
    // Левая ячейка строки итогов — с подписью («ИТОГО:», «Скидка:», ...)
    totalsLabelCell: {
        flex: 1, // занимает всё свободное место (динамически)
        padding: 4,
        fontWeight: SEMI, // полужирный
        fontSize: 9, // как основной текст
        textAlign: "right", // подпись прижата к правому краю ячейки
        borderTopWidth: BORDER_W,
        borderLeftWidth: BORDER_W,
        borderRightWidth: BORDER_W,
        borderColor: BORDER,
    },
    // Правая ячейка — с числовым значением. Фиксированной ширины (для выравнивания
    // сумм в столбик).
    totalsValueCell: {
        width: 110, // ширина ячейки со значением. Увеличь, если суммы обрезаются.
        padding: 4,
        textAlign: "right", // цифры прижаты вправо
        fontSize: 9,
        borderTopWidth: BORDER_W,
        borderRightWidth: BORDER_W,
        borderColor: BORDER,
    },
    // Модификатор для последней строки блока — добавляет нижнюю границу
    // (замыкает прямоугольник).
    totalsBottomEdge: { borderBottomWidth: BORDER_W },

    // ========================================================================
    // ФИНАЛЬНАЯ СУММА («Итого: 859 400,00» + сумма прописью)
    // ========================================================================
    finalTotal: {
        fontWeight: SEMI, // полужирный
        fontSize: 10, // крупнее основного (акцент)
        marginTop: 14, // отступ от блока итогов справа
    },
    // Сумма прописью (курсивом)
    words: {
        fontStyle: "italic",
        color: "#333",
        marginTop: 2,
        marginLeft: 8,
    },

    // ========================================================================
    // ОБЪЁМ / ВЕС ГРУЗА (справа, курсивом, серо)
    // ========================================================================
    volumeWeight: {
        fontSize: 8,
        fontStyle: "italic",
        color: MUTED,
        textAlign: "right",
        marginTop: 8, // отступ от суммы прописью
    },

    // ========================================================================
    // ДИСКЛЕЙМЕР («Настоящее коммерческое предложение не является офертой…»)
    // ========================================================================
    disclaimer: {
        fontSize: 8, // мельче основного
        color: MUTED, // серый, чтобы не привлекал внимание
        marginTop: 16, // отступ от объёма/веса
        lineHeight: 1.3, // небольшой воздух между строками юридического текста
    },

    // ========================================================================
    // ПОДПИСЬ ВНИЗУ ДОКУМЕНТА (С уважением / ФИО / телефон / email)
    // ========================================================================
    signature: {
        fontSize: 9,
        marginTop: 20, // большой отступ от дисклеймера (визуально отделяет)
        lineHeight: 1.4, // между строками подписи чуть больше воздуха
    },

    // ========================================================================
    // ШИРИНЫ КОЛОНОК ТАБЛИЦЫ (в %). ВАЖНО: сумма = 100%!
    // Если меняешь одну — не забудь скорректировать другую, иначе таблица
    // «уедет».
    // ========================================================================
    colNum: { width: "4%" }, // «№»
    colSku: { width: "12%" }, // Артикул
    colName: { width: "27%" }, // Наименование + Состав (широкая колонка)
    colQty: { width: "8%" }, // Кол-во шт.
    colPrice: { width: "10%" }, // Цена за шт.
    colPackQty: { width: "8%" }, // В тр. уп., шт.
    colPackPrice: { width: "10%" }, // Цена за уп.
    colPacks: { width: "8%" }, // Тр. уп. (число упаковок)
    colAmount: { width: "13%" }, // Сумма, руб.
})

function fmtQty(n) {
    if (n === null || n === undefined) return "—"
    const v = Math.round(Number(n) * 1000) / 1000
    return v.toLocaleString("ru-RU", { maximumFractionDigits: 3 })
}

function fmtMoney(n) {
    const v = Number(n) || 0
    return v.toLocaleString("ru-RU", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })
}

function ParamRow({ label, value }) {
    return (
        <View style={s.paramRow}>
            <Text style={s.paramLabel}>{label}:</Text>
            <Text style={s.paramValue}>{value || "—"}</Text>
        </View>
    )
}

function TotalsBlock({ totals }) {
    // Собираем строки в массив, чтобы понимать, какая последняя, и добавить
    // нижнюю границу только ей.
    const rows = [{ label: "ИТОГО:", value: fmtMoney(totals.sub) }]
    if (totals.discountPct > 0) {
        rows.push({ label: "Скидка:", value: `${totals.discountPct}%` })
        rows.push({ label: "Сумма скидки:", value: fmtMoney(totals.discountAmount) })
        rows.push({
            label: "Итого со скидкой:",
            value: fmtMoney(totals.finalAmount),
        })
    }
    if (totals.vatRate > 0) {
        rows.push({
            label: `В т.ч. НДС ${totals.vatRate}%:`,
            value: fmtMoney(totals.vatAmount),
        })
    }

    return (
        <View style={s.totalsBox}>
            {rows.map((r, i) => {
                const isLast = i === rows.length - 1
                const labelStyle = isLast
                    ? [s.totalsLabelCell, s.totalsBottomEdge]
                    : s.totalsLabelCell
                const valueStyle = isLast
                    ? [s.totalsValueCell, s.totalsBottomEdge]
                    : s.totalsValueCell
                return (
                    <View style={s.totalsRow} key={i}>
                        <Text style={labelStyle}>{r.label}</Text>
                        <Text style={valueStyle}>{r.value}</Text>
                    </View>
                )
            })}
        </View>
    )
}

export function ProposalDoc({ data }) {
    const {
        seller,
        logoSrc,
        number,
        date,
        validDays,
        buyer,
        endCustomer,
        deliveryTerm,
        paymentTerm,
        deliveryCondition,
        intro,
        items,
        totals,
        volume,
        weight,
        senderName,
        senderPhone,
        senderEmail,
    } = data

    return (
        <Document>
            <Page size='A4' style={s.page}>
                <View style={s.header} fixed>
                    {/* Image из @react-pdf/renderer — alt в PDF не существует */}
                    {/* eslint-disable-next-line jsx-a11y/alt-text */}
                    {logoSrc && <Image src={logoSrc} style={s.logo} />}
                    <View style={s.sellerAddr}>
                        <Text>{seller.address}</Text>
                        <Text>{seller.phones}</Text>
                        <Text>{seller.email}</Text>
                        <Text>{seller.site}</Text>
                    </View>
                </View>

                <Text style={s.title}>
                    Коммерческое предложение № {number} от {date}
                </Text>
                <Text style={s.subtitle}>действительно {validDays} рабочих дней</Text>

                <View style={s.paramsBlock}>
                    <ParamRow label='Покупатель' value={buyer} />
                    {endCustomer ? (
                        <ParamRow label='Конечный потребитель' value={endCustomer} />
                    ) : null}
                    <ParamRow label='Срок поставки' value={deliveryTerm} />
                    <ParamRow label='Условия оплаты' value={paymentTerm} />
                    <ParamRow label='Условия поставки' value={deliveryCondition} />
                </View>

                <Text style={s.intro}>{intro}</Text>

                {/* Table */}
                <View style={s.table}>
                    <View style={s.thead} fixed>
                        <Text style={[s.th, s.colNum]}>№</Text>
                        <Text style={[s.th, s.colSku]}>Артикул</Text>
                        <Text style={[s.th, s.colName]}>Наименование товара</Text>
                        <Text style={[s.th, s.colQty]}>Кол-во шт.</Text>
                        <Text style={[s.th, s.colPrice]}>Цена за шт.</Text>
                        <Text style={[s.th, s.colPackQty]}>В тр. уп., шт.</Text>
                        <Text style={[s.th, s.colPackPrice]}>Цена за уп.</Text>
                        <Text style={[s.th, s.colPacks]}>Тр. уп.</Text>
                        <Text style={[s.th, s.colAmount]}>Сумма, руб.</Text>
                    </View>
                    {items.map(item => (
                        <View style={s.row} key={item.n} wrap={false}>
                            <Text style={[s.td, s.colNum, s.tdNum]}>{item.n}</Text>
                            <Text style={[s.td, s.colSku]}>{item.sku || "—"}</Text>
                            <View style={[s.td, s.colName]}>
                                <Text style={s.itemName}>{item.name}</Text>
                                {item.contents ? (
                                    <Text style={s.contents}>{item.contents}</Text>
                                ) : null}
                            </View>
                            <Text style={[s.td, s.colQty, s.tdRight]}>{fmtQty(item.qty)}</Text>
                            <Text style={[s.td, s.colPrice, s.tdRight]}>
                                {fmtMoney(item.unitPrice)}
                            </Text>
                            <Text style={[s.td, s.colPackQty, s.tdRight]}>
                                {item.packQty ? fmtQty(item.packQty) : "—"}
                            </Text>
                            <Text style={[s.td, s.colPackPrice, s.tdRight]}>
                                {item.packPrice !== null && item.packPrice !== undefined
                                    ? fmtMoney(item.packPrice)
                                    : "—"}
                            </Text>
                            <Text style={[s.td, s.colPacks, s.tdRight]}>
                                {item.packs !== null && item.packs !== undefined
                                    ? Number.isInteger(item.packs)
                                        ? item.packs
                                        : fmtQty(item.packs)
                                    : "—"}
                            </Text>
                            <Text style={[s.td, s.colAmount, s.tdRight]}>
                                {fmtMoney(item.amount)}
                            </Text>
                        </View>
                    ))}
                </View>

                {/* Totals */}
                <TotalsBlock totals={totals} />

                <Text style={s.finalTotal}>Итого: {fmtMoney(totals.finalAmount)}</Text>
                <Text style={s.words}>{totals.words}</Text>

                {(volume || weight) && (
                    <View style={s.volumeWeight}>
                        {volume && <Text>Объём груза, м³: {volume}</Text>}
                        {weight && <Text>Вес груза, кг: {weight}</Text>}
                    </View>
                )}

                <Text style={s.disclaimer}>
                    Настоящее коммерческое предложение не является офертой (в соответствии со ст.
                    435 ГК РФ). {seller.name} оставляет за собой право не заключать договор, либо
                    заключить договор на иных условиях, отличных от предложенных.
                </Text>

                <View style={s.signature}>
                    <Text>С уважением,</Text>
                    <Text>{senderName || "—"}</Text>
                    {senderPhone ? <Text>Тел. {senderPhone}</Text> : null}
                    {senderEmail ? <Text>Email: {senderEmail}</Text> : null}
                </View>
            </Page>
        </Document>
    )
}

/**
 * Хелпер для вызова из API-роутов (.js), чтобы JSX оставался только в .jsx.
 * Возвращает Buffer с готовым PDF.
 */
export async function renderProposalPdf(data) {
    return renderToBuffer(<ProposalDoc data={data} />)
}
