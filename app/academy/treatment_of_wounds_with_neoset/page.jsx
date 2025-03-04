import Link from "next/link"

export default function treatmentOfWounds() {
    return (
        <>
            <div className='container mx-auto my-8 max-w-[1200px] px-10'>
                <div className='mb-6 flex flex-col items-center justify-center'>
                    <h1 className=''>СТАНДАРТНАЯ ОПЕРАЦИОННАЯ ПРОЦЕДУРА</h1>
                    <h2 className='font-semibold'>Проведение обработки ран набором NeoSet</h2>
                    <Link href='#' className='text-primary_green'>
                        (скачать в формате Word)
                    </Link>
                </div>
                <div className='space-y-3'>
                    <p>
                        <span className='font-semibold'>Цель:</span> профилактика возникновения
                        инфицирования раны, послеоперационных осложнений.
                    </p>

                    <p>
                        <span className='font-semibold'>Показания:</span> наличие чистой
                        послеоперационной раны.
                    </p>

                    <p>
                        <span className='font-semibold'>Область применения:</span> Перевязочный
                        кабинет хирургического отделения.
                    </p>

                    <p>
                        <span className='font-semibold'>Ответственность:</span> врач хирург,
                        медсестра перевязочной.
                    </p>

                    <p>
                        <span className='font-semibold'>Определение:</span> перевязка
                        послеоперационной раны – комплекс необходимой важной манипуляции, которая
                        предусматривает визуальный осмотр, оценку состояния раневой поверхности,
                        очищение и гигиену кожи и раны, а также включает ряд диагностических и
                        лечебных процедур, выполнение накладывания чистой повязки.
                    </p>

                    <p>
                        <span className='font-semibold'>Документирование:</span> медицинская карта
                        стационарного больного (перевязочный лист).
                    </p>

                    <h3 className='font-semibold'>Ресурсы:</h3>
                    <ol className='list-inside list-decimal'>
                        <li>
                            Растворы, антисептики для обработки ран применяемые в данный период
                            (Повидон-йод, кутасепт, Софта-Ман ИЗО и др.);
                        </li>
                        <li>Перчатки стерильные, нестерильные;</li>
                        <li>Набор «NeoSet» для обработки ран;</li>
                        <li>Адгезивные повязки (по типу Medipore+pad);</li>
                        <li>
                            Емкость КБСУ (коробка безопасной утилизации) для медицинских отходов
                            класса «Б»;
                        </li>
                        <li>Ёмкость с дезинфицирующим раствором для многоразовых инструментов;</li>
                        <li>
                            Стерильные салфетки (дополнительно – в зависимости от величины
                            обрабатываемой поверхности);
                        </li>
                        <li>Стерильные шарики – дополнительно;</li>
                        <li>Дополнительные стерильные инструменты и ИМН по необходимости;</li>
                        <li>Антисептическое мыло и бумажные полотенца;</li>
                        <li>Кожный антисептик для обработки рук;</li>
                    </ol>

                    <h3 className='font-semibold'>1. Подготовительные операции:</h3>
                    <ol>
                        <li>
                            1.1 Подготовка манипуляционного стола с необходимыми ресурсами для
                            перевязки;
                        </li>
                        <li>1.2 Представиться пациенту, рассказать ему о цели и ходе процедуры;</li>
                        <li>1.3 Произвести идентификацию пациента;</li>
                        <li>1.4 Постелить одноразовую простынку на перевязочный стол-кушетку;</li>
                        <li>
                            1.5 Помочь пациенту раздеться и занять удобное положение на перевязочном
                            столе-кушетке;
                        </li>
                        <li>
                            1.6 Произвести гигиену рук и обработку их антисептиком по алгоритму,
                            согласно методическим рекомендациям по обработке рук медицинского
                            персонала;
                        </li>
                        <li>1.7 Надеть нестерильные перчатки;</li>
                        <li>1.8 Снять пинцетом фиксирующую повязку бережно и щадяще;</li>
                        <li>
                            1.9 Утилизировать использованные повязки в ёмкость КБСУ с отходами
                            класса «Б» с полным погружением в раствор;
                        </li>
                        <li>
                            1.10 Снять перчатки, утилизировать с полным погружением в ёмкость с
                            отходами класса «Б» с раствором;
                        </li>
                        <li>
                            1.11 Произвести гигиеническую обработку рук по методическим
                            рекомендациям по обработки рук медицинских работников;
                        </li>
                    </ol>
                    <h3 className='font-semibold'>2. Проведение процедуры</h3>
                    <ol>
                        <li>
                            2.1 Открыть индивидуальный перевязочный набор, соблюдая правила асептики
                            и антисептики;
                        </li>
                        <li>2.2 Открыть стерильные перчатки;</li>
                        <li>2.3 Открыть «индивидуальный одноразовый набор для перевязки»;</li>
                        <li>
                            2.4 Налить в одноразовую ёмкость (чашка, баночка) дезинфицирующий
                            раствор для обработки ран;
                        </li>
                        <li>
                            2.5 Открыть индивидуальный набор стерильных салфеток, стерильные шарики;
                        </li>
                        <li>2.6 Произвести гигиеническую обработку рук;</li>
                        <li>
                            2.7 Надеть стерильные перчатки, соблюдая правила техники одевания
                            стерильных перчаток;
                        </li>
                        <li>
                            2.8 Осмотреть рану и кожу вокруг нее. Обратить внимание на состояние
                            краев раны (слипшиеся, зияют), наличие симптомов воспаления (боль, отек,
                            гиперемия);
                        </li>
                        <li>
                            2.9 С помощью пинцета обработать рану, кожу вокруг раны стерильными
                            шариками смоченными дезинфицирующим раствором от центра к периферии.
                            Обработку поля провести дважды с экспозицией 1 минута;
                        </li>
                        <li>
                            2.10 Использованный перевязочный материал поместить в ёмкость класса
                            «Б»;
                        </li>
                        <li>2.11 Закрыть рану адгезивной повязкой (по типу Medipore+pad);</li>
                        <li>
                            2.12 Поместить использованные инструменты с полным погружением в ёмкость
                            с дезинфицирующим раствором;
                        </li>
                        <li>2.13 Снять перчатки и поместить в ёмкость с отходами класса «Б»;</li>
                        <li>2.14 Обработать руки;</li>
                        <li>
                            2.15 Сообщить пациенту о состоянии раны, проинструктировать его о
                            дальнейших действиях;
                        </li>
                        <li>
                            2.16 Сделать соответствующую запись о результатах выполнения перевязки в
                            медицинскую документацию;
                        </li>
                    </ol>
                    <h3 className='font-semibold'>3. Примечание</h3>
                    <ul>
                        <li>
                            3.1 В течение 15-20 минут после манипуляции необходимо наблюдать за
                            состоянием повязки (фиксации, отделяемым);
                        </li>
                        <li>3.2 При пропитывании повязки кровью сообщить врачу.</li>
                    </ul>
                    <h3 className='font-semibold'>Нормативные документы:</h3>
                    <ul>
                        <li>
                            &#8212; Федеральный закон от 21.11.2011 № 323-ФЗ «Об основах охраны
                            здоровья граждан в Российской Федерации»;
                        </li>
                        <li>
                            &#8212; СанПиН 3.3686-21 «Санитарно-эпидемиологические требования по
                            профилактике инфекционных болезней» (в ред.№3 от 25.05.2022);
                        </li>
                        <li>
                            &#8212; Постановление Главного государственного санитарного врача РФ от
                            28.01.2021 N 3 (ред. от 14.02.2022) &quot;Об утверждении санитарных
                            правил и норм СанПиН 2.1.3684-21 &quot;Санитарно-эпидемиологические
                            требования к содержанию территорий городских и сельских поселений, к
                            водным объектам, питьевой воде и питьевому водоснабжению, атмосферному
                            воздуху, почвам, жилым помещениям, эксплуатации производственных,
                            общественных помещений, организации и проведению
                            санитарно-противоэпидемических (профилактических) мероприятий&quot;
                            (вместе с &quot;СанПиН 2.1.3684-21. Санитарные правила и нормы...&quot;)
                            (Зарегистрировано в Минюсте России 29.01.2021 N 62297);
                        </li>
                        <li>
                            &#8212; Постановление Главного государственного санитарного врача
                            Российской Федерации от 24.12.2020 N 44 &quot;Об утверждении санитарных
                            правил СП 2.1.3678-20 &quot;Санитарно-эпидемиологические требования к
                            эксплуатации помещений, зданий, сооружений, оборудования и транспорта, а
                            также условиям деятельности хозяйствующих субъектов, осуществляющих
                            продажу товаров, выполнение работ или оказание услуг&quot;;
                        </li>
                        <li>
                            &#8212; Приказ Минздрава России от 12.11.2021 N 1051н &quot;Об
                            утверждении Порядка дачи информированного добровольного согласия на
                            медицинское вмешательство и отказа от медицинского вмешательства, формы
                            информированного добровольного согласия на медицинское вмешательство и
                            формы отказа от медицинского вмешательства&quot;.
                        </li>
                    </ul>
                </div>
            </div>
        </>
    )
}
