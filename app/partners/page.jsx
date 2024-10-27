import ConnectWithUs from "@/components/ConnectWithUs"
import Block from "@/components/Block"
import NavPartners from "@/components/NavPartners"

export const metadata = {
    title: "Партнерам",
    description:
        "Российский производитель медицинских одноразовых перевязочных материалов и процедурных стерильных наборов",
}

export default function Partners() {
    const partnersInfo = [
        {
            title: "Для государственных медучреждений",
            description: [
                "Конкурентная цена продукции",
                "Использование товара российского производителя",
                "Юридическая чистота сделки",
                "Соблюдение сроков поставки",
                "Работа по 44-ФЗ и по 223-ФЗ",
            ],
        },
        {
            title: "Для коммерческих клиник",
            description: [
                "Гибкая ценовая политика",
                "Долговременные контракты",
                "Оперативность и стабильность поставок",
                "Поддержка выделенного менеджера",
            ],
        },
        {
            title: "Для дистрибьюторов",
            description: [
                "Индивидуальные условия",
                "Маркетинговая поддержка",
                "Бронирование сделок",
                "Наличие товара на складах",
                "Грамотная логистика",
                "Обучение по продукту",
            ],
        },
    ]

    return (
        <>
            <Block>
                <div className='my-10 flex items-center justify-start'>
                    <h1 className='text-4xl font-semibold text-mainGreen'>
                        Выгоды сотрудничества{" "}
                        <span className='text-txtGreen'>с компанией OneStep</span>
                    </h1>
                </div>

                <div className='flex flex-col space-y-5 lg:flex-row lg:space-x-8 lg:space-y-0'>
                    {partnersInfo.map(elem => {
                        return (
                            <div
                                key={elem.title}
                                className='group flex flex-1 cursor-pointer flex-col space-y-5 rounded-3xl bg-white p-5 pl-10 shadow-md lg:px-10 lg:py-6'
                            >
                                <div className='h-9 w-9 rotate-45 rounded-lg bg-primary_green group-hover:animate-spinner'></div>
                                <h1 key={elem.title} className='text-2xl text-gray-950'>
                                    {elem.title}:
                                </h1>
                                <ul className='list-inside list-disc text-lg leading-normal text-txtMiddle'>
                                    {elem.description.map(el => (
                                        <li key={el}>{el}</li>
                                    ))}
                                </ul>
                            </div>
                        )
                    })}
                </div>
            </Block>

            {/* nextblock */}
            <div className='container mx-auto mt-14 max-w-[1200px] px-4'>
                <div className='justify-starts my-10 flex items-center'>
                    <h1 className='text-4xl font-semibold text-txtGreen'>
                        Продукция <span className='text-mainGreen'>OneStep </span>
                        <span>поможет</span>{" "}
                    </h1>
                </div>

                <div className='flex flex-col space-y-5 lg:flex-row lg:space-x-8 lg:space-y-0'>
                    <div className='flex flex-auto flex-col space-y-5 rounded-3xl bg-white p-5 pl-10 shadow-md lg:w-2/3 lg:px-10'>
                        <h1 className='text-2xl font-semibold text-gray-950'>Клиникам:</h1>
                        <div className='grid gap-x-12 md:grid-cols-2'>
                            <ul className='list-inside list-disc text-lg leading-normal text-txtMiddle'>
                                <li>Снизить риски послеоперационных осложнений</li>
                                <li>
                                    Предоставить пациентам комфорт и удобство оказания медицинских
                                    услуг
                                </li>
                                <li>
                                    Удовлетворить потребности персонала в качественных перевязочных
                                    материалах
                                </li>
                            </ul>
                            <ul className='list-inside list-disc text-lg leading-normal text-txtMiddle'>
                                <li>Сократить трудозатраты на рутинные манипуляции</li>
                                <li>Повысить экономию ресурсов</li>
                                <li>Эффективно организовать учёт материалов</li>
                                <li>Снизить инспекционную нагрузку</li>
                            </ul>
                        </div>
                    </div>
                    <div className='flex flex-auto flex-col space-y-5 rounded-3xl bg-white p-5 pl-10 shadow-md lg:w-1/3 lg:px-10 lg:py-6'>
                        <h1 className='text-2xl font-semibold text-gray-950'>Поставщикам:</h1>
                        <ul className='list-inside list-disc text-lg leading-normal text-txtMiddle'>
                            <li>Интенсивно продвинуться на рынке с товаром высокого спроса</li>
                            <li>Получить прибыль с минимальными вложениями</li>
                            <li>
                                Укрепить имидж поставщика качетвенной продукции, произведенной в
                                России
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
            <div className='mt-10'>
                <NavPartners />
            </div>
            {/* nextblock */}
            <ConnectWithUs
                title='Стать нашим партнером легко, работать с нами выгодно!'
                titleForForm='Стать нашим партнером:'
                textButton='Связаться со специалистом'
            />
        </>
    )
}
