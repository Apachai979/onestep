import Image from 'next/image'
import ConnectUs from '@/components/ConnectUs'

export const metadata = {
    title: 'О компании',
    description:
        'Российский производитель медицинских одноразовых перевязочных материалов и процедурных стерильных наборов',
}

export default function About() {
    const ruleOneStep = [
        {
            title: 'Мы дорожим своими КЛИЕНТАМИ',
            description:
                'Создавая компанию более 25 лет назад, мы поставили перед собой амбициозную цель: обеспечить современным медицинским оборудованием лечебные учреждения региона. Поэтому, в центре нашего внимания - ключевые запросы ЗАКАЗЧИКОВ. И в том, что многие из них получили статус передовых высокотехнологичных медицинских центров, есть и наш вклад.',
            src: '/about/client.jpg',
        },
        {
            title: 'Мы гордимся своей КОМАНДОЙ',
            description:
                'Создавая компанию более 25 лет назад, мы поставили перед собой амбициозную цель: обеспечить современным медицинским оборудованием лечебные учреждения региона. Поэтому, в центре нашего внимания - ключевые запросы ЗАКАЗЧИКОВ. И в том, что многие из них получили статус передовых высокотехнологичных медицинских центров, есть и наш вклад.',
            src: '/about/team.jpg',
        },
        {
            title: 'Мы создаем новые НАПРАВЛЕНИЯ',
            description:
                'Объединяя все, что наработали ранее, руководствуясь приоритетными задачами медицинской отрасли в стране, мы вышли на новый уровень развития: освоение производственной сферы, отвечающей запросам сегодняшнего дня – производство хирургических материалов нового поколения.',
            src: '/about/flow.jpg',
        },
        {
            title: 'Мы открыты для БУДУЩЕГО!',
            description:
                'В перспективе – развитие существующих направлений и создание новых. Каких – ответ даст сама жизнь и задачи наших заказчиков. А наша команда, надеемся, будет всегда профессионально готова к новым вызовам!',
            src: '/about/future.jpg',
        },
        {
            title: 'Мы готовы к новому ПАРТНЕРСТВУ',
            description:
                'Вы - ученый или научный коллектив с разработанной, но не воплощенной идеей в области медицины? Ваша клиника - в поиске новых технологических решений по оказанию медицинской помощи и готова стать площадкой для апробации и внедрения? Мы готовы стать той конструкторско-производственной площадкой, которая позволит объединить наши устремления в единый ПРОЕКТ!',
            src: '/about/partners.jpg',
        },
    ]

    return (
        <>
            <div className="container mx-auto max-w-[1200px] px-4">
                <div className="relative mx-2 flex h-[250px] items-center justify-center overflow-hidden rounded-3xl md:h-[400px] lg:h-[560px]">
                    <div className="absolute z-10 h-full w-full bg-txtGreen/30"></div>
                    <div className="absolute z-10 h-full w-full bg-gradient-to-b from-mainGreen/20 via-mainGreen/50 to-mainGreen/40"></div>
                    <div className="absolute z-0 h-full w-full bg-[url('/about/background.jpg')] bg-contain bg-fixed bg-top bg-no-repeat"></div>
                    {/* <Image className='rounded-2xl object-cover absolute z-0 '
                        src="/about/background.jpg"
                        width={1920}
                        height={1080}
                        alt="EA">
                    </Image> */}
                    <h1 className="absolute z-20 text-center text-5xl font-bold text-white">
                        OneStep сегодня
                    </h1>
                </div>
            </div>

            {/* Nextblock */}

            <div className="container mx-auto max-w-[1200px] px-4">
                <div className="m-6 flex flex-col-reverse items-center justify-center space-y-6 space-y-reverse lg:m-10 lg:flex-row lg:space-x-10">
                    <div className="flex flex-col space-y-6 text-xl text-txtGreen/90 lg:w-2/3">
                        <h2 className="text-3xl text-txtGreen">
                            {' '}
                            — Идея запустить собственное производство обсуждалась нашей командой
                            давно.
                        </h2>
                        <p>
                            Но решение о старте было принято стремительно. Причиной тому -
                            изменившаяся ситуация: резкое снижение доступа к мировым рынкам
                            медицинской продукции.
                        </p>
                        <p>
                            Предполагалось ли, с какими вызовами придется столкнуться нам при
                            открытии нового бизнес-направления, да еще в условиях возникающей
                            неопределенности? Конечно, нет.
                        </p>
                        <p>
                            Но ответственность, драйв и творческая позиция команды сделали возможным
                            достижение поставленной цели.Практика показала, что мы верно выбрали
                            вектор развития. Идея отечественного производства в настоящее время
                            актуальна, как никогда.
                        </p>
                        <p>
                            Наш большой проект продолжает твориться руками и усилиями многих. Я
                            благодарю за достигнутый результат нашу команду, партнеров, заказчиков!
                            Без вас и вашей поддержки мы бы ничего не добились.
                        </p>
                    </div>
                    <div className="flex flex-col items-center lg:w-1/3">
                        <Image src="/about/PhotoEA.png" width={300} height={300} alt="EA" />
                        <h2 className="text-center text-2xl leading-tight text-txtGreen">
                            Даниленко <p>Елена Анатольевна</p>
                        </h2>
                        <p className="text-center text-base leading-relaxed text-txtGreen">
                            {' '}
                            директор по развитию{' '}
                        </p>
                    </div>
                </div>
            </div>

            {/* Nextblock */}

            <div className="bg-white">
                <div className="container mx-auto max-w-[1200px] px-4">
                    <div className="mb-14 mt-10">
                        <h1 className="pt-10 text-center text-4xl font-semibold text-mainGreen">
                            История <span className="text-txtGreen">компании</span>
                        </h1>
                    </div>
                    <div className="space-y-2">
                        <div className="flex space-x-2">
                            <div className="flex w-14 flex-col items-center space-y-3 lg:order-2 lg:mr-[45%] lg:w-[10%]">
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-mainGreen text-base text-white shadow-md">
                                    1
                                </div>
                                <div className="min-h-[160px] w-0 flex-1 border-r border-solid border-gray-400 md:min-h-[90px]"></div>
                            </div>
                            <div className="-mt-6 mb-10 flex-1 space-y-2 lg:w-[45%]">
                                <h2 className="text-5xl font-semibold text-txtLight lg:text-right">
                                    1994
                                </h2>
                                <p className="text-xl text-gray-950/95 lg:text-right">
                                    {' '}
                                    Создание компании, поставка и обслуживание импортного
                                    медицинского оборудования для медицинских центров.
                                </p>
                            </div>
                        </div>
                        <div className="flex space-x-2 lg:space-x-0">
                            <div className="flex w-14 flex-col items-center space-y-3 lg:order-1 lg:ml-[45%] lg:w-[10%]">
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-mainGreen text-base text-white shadow-md">
                                    2
                                </div>
                                <div className="min-h-[160px] w-0 flex-1 border-r border-solid border-gray-400 md:min-h-[90px]"></div>
                            </div>
                            <div className="-mt-6 mb-10 flex-1 space-y-2 lg:order-2 lg:w-[45%]">
                                <h2 className="text-5xl font-semibold text-txtLight">1999</h2>
                                <p className="text-xl text-gray-950/95">
                                    {' '}
                                    Открытие Регионального Сервисного центра по ремонту медицинского
                                    оборудования.
                                </p>
                            </div>
                        </div>
                        <div className="flex space-x-2">
                            <div className="flex w-14 flex-col items-center space-y-3 lg:order-2 lg:mr-[45%] lg:w-[10%]">
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-mainGreen text-base text-white shadow-md">
                                    3
                                </div>
                                <div className="min-h-[160px] w-0 flex-1 border-r border-solid border-gray-400 md:min-h-[90px]"></div>
                            </div>
                            <div className="-mt-6 mb-10 flex-1 space-y-2 lg:w-[45%]">
                                <h2 className="text-5xl font-semibold text-txtLight lg:text-right">
                                    2007
                                </h2>
                                <p className="text-xl text-gray-950/95 lg:text-right">
                                    {' '}
                                    Открытие собственного направления по разработкам в области
                                    программного обеспечения для медицинских центров.
                                </p>
                            </div>
                        </div>
                        <div className="flex space-x-2">
                            <div className="flex w-14 flex-col items-center space-y-3 lg:order-1 lg:ml-[45%] lg:w-[10%]">
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-mainGreen text-base text-white shadow-md">
                                    4
                                </div>
                                <div className="min-h-[160px] w-0 flex-1 border-r border-solid border-gray-400 md:min-h-[90px]"></div>
                            </div>
                            <div className="-mt-6 mb-10 flex-1 space-y-2 lg:order-2 lg:w-[45%]">
                                <h2 className="text-5xl font-semibold text-txtLight">2016</h2>
                                <p className="text-xl text-gray-950/95">
                                    {' '}
                                    Получение прав официального дистрибьютора ряда мировых
                                    производителей медицинских изделий.
                                </p>
                            </div>
                        </div>
                        <div className="flex space-x-2">
                            <div className="flex w-14 flex-col items-center space-y-3 lg:order-2 lg:mr-[45%] lg:w-[10%]">
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-mainGreen text-base text-white shadow-md ">
                                    5
                                </div>
                                <div className="min-h-[160px] w-0 flex-1 border-r border-solid border-gray-400 md:min-h-[90px]"></div>
                            </div>
                            <div className="-mt-6 mb-10 flex-1 space-y-2 lg:w-[45%]">
                                <h2 className="text-5xl font-semibold text-txtLight lg:text-right">
                                    2020
                                </h2>
                                <p className="text-xl text-gray-950/95 lg:text-right">
                                    {' '}
                                    Начало проектирования собственного производства под брендом
                                    «OneStep».
                                </p>
                            </div>
                        </div>
                        <div className="flex space-x-2">
                            <div className="flex w-14 flex-col items-center space-y-3 lg:order-1 lg:ml-[45%] lg:w-[10%]">
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-mainGreen text-base text-white shadow-md ">
                                    6
                                </div>
                                {/* <div className='flex-1 w-0 border-r border-solid border-gray-400'></div> */}
                            </div>
                            <div className="-mt-6 mb-10 flex-1 space-y-2 lg:order-2 lg:w-[45%]">
                                <h2 className="text-5xl font-semibold text-txtLight">2022</h2>
                                <p className="text-xl text-gray-950/95">
                                    {' '}
                                    Запуск производственных мощностей по изготовлению
                                    многофункциональных процедурных наборов.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* NextBlock  ПРИНЦИПЫ ONESTEP*/}
            <div className="container mx-auto max-w-[1200px] px-4">
                <div className="mb-12 mt-5 space-y-14 px-16">
                    <div className="mb-10">
                        <h1 className="pt-10 text-center text-4xl font-semibold text-txtGreen">
                            Принципы <span className="text-mainGreen">OneStep</span>
                        </h1>
                    </div>

                    {ruleOneStep.map(elem => {
                        let reverse = ''
                        ruleOneStep.indexOf(elem) % 2 === 0
                            ? (reverse = ' lg:flex-row lg:space-x ')
                            : (reverse = ' lg:flex-row-reverse lg:space-x-reverse ')

                        return (
                            <div
                                key={elem.title}
                                className={`flex flex-col-reverse items-center justify-center space-y-5 space-y-reverse lg:space-y-0 ${reverse} lg:space-x-10`}
                            >
                                <div className="lg:w-1/2">
                                    <h2 className="mb-1 text-2xl font-semibold text-mainGreen lg:mb-4">
                                        {elem.title}
                                    </h2>
                                    <p className="text-xl text-gray-950/95">{elem.description}</p>
                                </div>
                                <div className="lg:w-1/2">
                                    <Image
                                        className="rounded-2xl object-cover shadow-md"
                                        src={elem.src}
                                        width={1920}
                                        height={1080}
                                        alt="EA"
                                    ></Image>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* NextBlock */}

            <div className="bg-white pb-5">
                <div className="container mx-auto mb-6 max-w-[1200px] px-4">
                    <div className="mb-8">
                        <h1 className="px-20 pt-10 text-center text-4xl font-semibold text-txtGreen">
                            Социальная ответственность компании{' '}
                            <span className="text-mainGreen">OneStep</span>
                        </h1>
                    </div>
                    <div className="grid gap-x-8 gap-y-8 px-14 md:grid-cols-2 md:gap-y-8">
                        <div className="flex-1 space-y-2 md:space-y-3">
                            <h2 className="text-2xl font-semibold text-mainGreen">
                                Медицинское сообщество
                            </h2>
                            <p className="text-xl text-gray-950/95">
                                Социальная ответственность нашей компании проявляется уже в самой
                                идее производства высокотехнологичных качественных изделий,
                                заботящихся о труде и безопасности медицинских работников, а также –
                                о здоровье и безопасности пациентов.
                            </p>
                        </div>
                        <div className="flex-1 space-y-2 md:space-y-3">
                            <h2 className="text-2xl font-semibold text-mainGreen">Коллектив</h2>
                            <p className="text-xl text-gray-950/95">
                                Компания заботится о создании условий работы внутри коллектива,
                                способствующих максимальному раскрытию способностей работников, их
                                участия в жизни и работе организации.
                            </p>
                        </div>
                        <div className="flex-1 space-y-2 md:space-y-3">
                            <h2 className="text-2xl font-semibold text-mainGreen">
                                Благотворительность
                            </h2>
                            <p className="text-xl text-gray-950/95">
                                Компания занимается благотворительной и волонтерской деятельностью,
                                оказывая поддержку образовательным и социальным проектам.
                            </p>
                        </div>
                        <div className="flex-1 space-y-2 md:space-y-3">
                            <h2 className="text-2xl font-semibold text-mainGreen">Экология</h2>
                            <p className="text-xl text-gray-950/95">
                                Мы считаем важным бережное отношение к окружающей среде и потому
                                принимаем все меры по сокращению объемов образуемых отходов
                                производства, повышению степени очистки выбрасываемых веществ,
                                внедрению передовых технологий, а также обучению персонала принципам
                                экологической культуры.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <ConnectUs
                title="Мы открыты для новых проектов и сотрудничества"
                txtbutton="Связаться со специалистом"
            />
        </>
    )
}
