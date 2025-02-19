import Image from "next/image"

export default function centerTraining() {
    return (
        <>
            <div className='container mx-auto my-4 max-w-[1200px] space-y-4 px-10'>
                <div className='flex flex-col items-center justify-center'>
                    <h1 className='mb-2 text-center text-2xl font-semibold'>
                        Центры повышения квалификации для медицинских работников
                    </h1>
                </div>
                <div className=''>
                    <Image
                        src='/academy/image_topics/center_up_training.jpg'
                        alt='Центры повышения квалификации Onestep'
                        width={1920}
                        height={1080}
                        className='h-[270px] w-[390px] rounded-xl object-cover shadow-lg md:float-left md:m-2 md:mr-6'
                    ></Image>
                </div>
                <p className='mb-6 mt-6'>
                    В соответствии с Концепцией развития непрерывного медицинского и
                    фармацевтического образования в Российской Федерации на период до 2021 года
                    (далее – Концепция), утвержденной
                    <span className='text-mainGreen'>
                        приказом Министерства здравоохранения Российской Федерации от 21 ноября 2017
                        года №926
                    </span>
                    ,
                    <span className='font-semibold'>
                        непрерывное медицинское и фармацевтическое образование осуществляется через:
                    </span>
                </p>
                <ul className='list-inside list-decimal'>
                    <li>
                        освоение образовательных программ в организациях, осуществляющих
                        образовательную деятельность ({" "}
                        <span className='font-semibold'>&quot;формальное образование&quot;</span>);
                    </li>
                    <li>
                        обучение в рамках деятельности профессиональных некоммерческих организаций
                        (&quot;неформальное образование&quot;);
                    </li>
                    <li>
                        индивидуальную познавательную деятельность (&quot;самообразование&quot;).
                    </li>
                </ul>
                <p className='ml-4'>
                    Для определения трудоемкости в непрерывном образовании применяется система
                    зачетных единиц (ЗЕТ): 1 ЗЕТ равен 1 академическому часу.
                </p>

                <p className='font-semibold'>
                    Рекомендованный минимальный суммарный объем освоенных образовательных элементов
                    непрерывного образования составляет не менее 250 академических часов (или 250
                    ЗЕТ) за пятилетний период.
                </p>
                <p>
                    При этом скорость обновления информации в медицине и фармации требует
                    постоянного совершенствования профессиональных компетенций, т.е. не быстрого
                    набора всех 250 ЗЕТ непосредственно перед следующей процедурой аккредитации, а
                    ежегодного их накопления преимущественно в равных долях.
                </p>
                <p>
                    Так, оптимальным графиком обучения в рамках непрерывного образования можно
                    считать ежегодное обучение в объеме около 50 ЗЕТ. При необходимости возможны
                    незначительные отклонения в суммарной трудоемкости ежегодно осваиваемых
                    образовательных элементов, но важно не допускать перерывов в обучении более
                    одного года. Такой ритм позволит Вам постоянно быть в курсе изменений
                    медицинской науки и практики.
                </p>
                <p>
                    Чтобы начать обучение, вам необходимо зарегистрироваться на двух сайтах: сайте
                    Совета НМО и Портале непрерывного медицинского и фармацевтического образования
                    Минздрава России.
                </p>
                <p>
                    Первая площадка –{" "}
                    <span className='italic'>
                        сайт Координационного совета по развитию непрерывного медицинского и
                        фармацевтического образования Минздрава России
                    </span>{" "}
                    (<span className='text-mainGreen'>http://www.sovetnmo.ru/</span>). Он полностью
                    посвящен теме непрерывного медицинского образования. На нем вы найдете
                    необходимую информацию об электронных модулях и учебных мероприятиях, за
                    прохождение которых вы будете получать образовательные кредиты.
                </p>
                <p>
                    Второй сайт –{" "}
                    <span className='italic'>
                        это Портал непрерывного медицинского и фармацевтического образования
                        Минздрава России
                    </span>{" "}
                    (<span className='text-mainGreen'>https://edu.rosminzdrav.ru/</span>), он служит
                    площадкой для выбора электронных модулей, учебных мероприятий и дополнительных
                    профессиональных программ повышения квалификации непрерывного образования и
                    регистрации на участие в них.
                </p>

                <p>
                    Регистрация на данных сайтах является обязательной процедурой для участников
                    системы непрерывного медицинского образования, то есть лиц, получивших
                    сертификаты специалиста или свидетельства об аккредитации специалиста после
                    01.01.2016 года. После регистрации на обоих сайтах необходимо{" "}
                    <span className='text-mainGreen'>синхронизировать личные кабинеты</span>.
                    Синхронизация нужна для того, чтобы ваше участие в образовательных мероприятиях
                    (конференциях, семинарах, мастер-классах, вебинарах) после учета на сайте
                    sovetnmo.ru также отображалось в образовательном портфолио на портале
                    edu.rosminzdrav.ru.
                </p>

                <p>
                    <span className='font-semibold'>
                        Портал непрерывного медицинского и фармацевтического образования Минздрава
                        России{" "}
                    </span>
                    <span className='text-mainGreen'>edu.rosminzdrav.ru</span>, который содержит
                    образовательные элементы, соответствующие всем компонентам непрерывного
                    образования.
                </p>
                <p>
                    Портал <span className='text-mainGreen'>edu.rosminzdrav.ru</span> является
                    единственным официальным ресурсом планирования и учета образовательной
                    активности специалистов здравоохранения в рамках непрерывного образования.
                </p>

                <p>
                    Для поддержания и повышения своего профессионального уровня Вам рекомендуется
                    включать в свой план обучения различные образовательные элементы, входящие в
                    перечни Портала:
                </p>
                <ul className='list-inside list-decimal'>
                    <li>
                        программы повышения квалификации, обеспечивающие непрерывное
                        совершенствование профессиональных навыков и расширение квалификации;
                    </li>
                    <li>
                        различные типы интерактивных образовательных модулей: короткие онлайн-курсы,
                        интерактивные ситуационные задачи, компьютерные тренажеры и др.,
                        разработанные с учетом порядков оказания медицинской помощи, клинических
                        рекомендаций и принципов доказательной медицины;
                    </li>
                    <li>
                        образовательные мероприятия, реализуемые или контролируемые некоммерческими
                        профессиональными обществами: семинары, мастер-классы, школы практикующего
                        врача, вебинары и др.
                    </li>
                </ul>

                <p>
                    С помощью технических средств Портала Вы можете включать в свой план обучения
                    различные образовательные элементы. Результаты их освоения с учетом указанной
                    трудоемкости в ЗЕТ будут учитываться в Вашем портфолио.
                </p>
            </div>
        </>
    )
}
