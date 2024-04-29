import ConnectWithUs from '@/components/ConnectWithUs';
import Block from '@/components/Block';
import NavPartners from '@/components/NavPartners';

export const metadata = {
    title: 'Партнерам',
    description: 'Российский производитель медицинских одноразовых перевязочных материалов и процедурных стерильных наборов',
}

export default function Partners() {

    const partnersInfo = [
        { title: "Для государственных медучреждений", description: ['Конкурентная цена продукции', 'Использование товара российского производителя', 'Юридическая чистота сделки', 'Соблюдение сроков поставки', 'Работа по 44-ФЗ и по 223-ФЗ'] },
        { title: "Для коммерческих клиник", description: ['Гибкая ценовая политика', 'Долговременные контракты', 'Оперативность и стабильность поставок', 'Поддержка выделенного менеджера'] },
        { title: "Для дистрибьюторов", description: ['Индивидуальные условия', 'Маркетинговая поддержка', 'Бронирование сделок', 'Наличие товара на складах', 'Грамотная логистика', 'Обучение по продукту'] },
    ]

    return (
        <>
            <Block>
                <div className="flex justify-start items-center my-10 ">
                    <h1 className="text-4xl text-mainGreen font-semibold">Выгоды сотрудничества <span className="text-txtGreen">с компанией OneStep</span></h1>
                </div>

                <div className="flex space-y-5 lg:space-y-0 flex-col lg:flex-row lg:space-x-8">

                    {partnersInfo.map((elem) => {
                        return (
                            <div className="group cursor-pointer flex-1 flex bg-white flex-col p-5 pl-10 lg:px-10 lg:py-6 space-y-5 rounded-3xl shadow-md" >
                                <div className='h-9 w-9 rotate-45 bg-primary_green rounded-lg group-hover:animate-spinner'></div>
                                <h1 key={elem.title} className='text-2xl text-gray-950'>{elem.title}:</h1>
                                <ul className="list-disc list-inside text-txtMiddle text-lg leading-normal">
                                    {elem.description.map((el) => (<li key={el}>{el}</li>))}
                                </ul>
                            </div>
                        )
                    })}

                </div>
            </Block>

            {/* nextblock */}
            <div className="container mx-auto px-4 max-w-[1200px] mt-14" >
                <div className="flex justify-starts items-center my-10">
                    <h1 className="text-4xl text-txtGreen font-semibold">Продукция <span className="text-mainGreen">OneStep </span><span>поможет</span> </h1>
                </div>

                <div className="flex space-y-5 lg:space-y-0 flex-col lg:flex-row lg:space-x-8">
                    <div className="flex-auto lg:w-2/3 flex bg-white flex-col p-5 pl-10 lg:px-10  space-y-5 rounded-3xl shadow-md   ">
                        <h1 className='text-2xl text-gray-950 font-semibold'>Клиникам:</h1>
                        <div className='grid md:grid-cols-2 gap-x-12'>
                            <ul className="list-disc list-inside text-txtMiddle text-lg leading-normal">
                                <li>Снизить риски послеоперационных осложнений</li>
                                <li>Предоставить пациентам комфорт и удобство оказания медицинских услуг</li>
                                <li>Удовлетворить потребности персонала в качественных перевязочных материалах</li>
                            </ul>
                            <ul className="list-disc list-inside text-txtMiddle text-lg leading-normal">
                                <li>Сократить трудозатраты на рутинные манипуляции</li>
                                <li>Повысить экономию ресурсов</li>
                                <li>Эффективно организовать учёт материалов</li>
                                <li>Снизить инспекционную нагрузку</li>
                            </ul>
                        </div>
                    </div>
                    <div className="flex-auto lg:w-1/3 flex bg-white flex-col p-5 pl-10 lg:px-10 lg:py-6 space-y-5 rounded-3xl shadow-md">
                        <h1 className='text-2xl text-gray-950 font-semibold'>Поставщикам:</h1>
                        <ul className="list-disc list-inside text-txtMiddle text-lg leading-normal">
                            <li>Интенсивно продвинуться на рынке с товаром высокого спроса</li>
                            <li>Получить прибыль с минимальными вложениями</li>
                            <li>Укрепить имидж поставщика качетвенной продукции, произведенной в России</li>
                        </ul>
                    </div>
                </div>

            </div >

            {/* nextblock */}
            < ConnectWithUs title='Стать нашим партнером легко, работать с нами выгодно!' titleForForm="Стать нашим партнером:" textButton='Связаться со специалистом' />
            <NavPartners />
        </>
    )
}