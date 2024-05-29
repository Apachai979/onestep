import { SimpleVideo } from '@/components/SimpleVideo'
import Image from 'next/image'
import ConnectUs from '@/components/ConnectUs'

export const metadata = {
    title: 'О производстве',
    description: 'Российский производитель медицинских одноразовых перевязочных материалов и процедурных стерильных наборов',
}

const lean = [
    {
        title: 'Производим ровно столько продукции, сколько нужно потребителям',
        src: '/Manufacture/box.svg',
    },
    {
        title: 'Гарантируем заказчику быструю и безопасную доставку продукции',
        src: '/Manufacture/car.svg',
    },
    {
        title: 'При помощи современных технологий мы научились использовать материальные, временные и трудовые ресурсы максимально эффективно',
        src: '/Manufacture/technik.svg',
    },
]
const lean2 = [
    {
        title: 'Стремимся к идеальному качеству продукции при нулевом проценте брака',
        src: '/Manufacture/serct.svg',
    },
    {
        title: 'Мы сократили площадь складских помещений до необходимого минимума',
        src: '/Manufacture/home.svg',
    },
    {
        title: 'Каждый сотрудник предприятия имеет возможность раскрыть свой творческий потенциал, так как вовлечен в процесс создания продукта',
        src: '/Manufacture/persons.svg',
    },
]
const cleanZoneImg = [
    {
        src: '/manufacture/cleanzone1.jpg',
        alt: 'cleanzone',
    },
    {
        src: '/manufacture/cleanzone2.jpg',
        alt: 'clean',
    },
    {
        src: '/manufacture/cleanzone3.jpg',
        alt: 'zone',
    },
    {
        src: '/manufacture/cleanzone4.jpg',
        alt: 'zone',
    },
]

export default function Manufacture() {
    return (
        <>
            <div className="flex justify-center h-auto w-full relative">
                <SimpleVideo />
            </div>
            <div className="container mx-auto px-4 max-w-[1200px] my-10">
                <div className="flex xl:space-x-20 flex-col xl:flex-row space-y-6 xl:space-y-0">
                    <div className="flex-1 justify-self-end pt-2">
                        <h1 className="text-6xl font-semibold text-mainGreen text-left xl:text-right">
                            OneStep <span className="text-txtGreen">— это:</span>
                        </h1>
                    </div>
                    <div className="flex-1 justify-self-start">
                        <ul className="list-disc list-inside text-2xl text-txtGreen leading-relaxed">
                            <li>
                                высокотехнологичное оборудование, разработанное с учетом наших
                                требований;
                            </li>
                            <li>сырье от лучших мировых поставщиков;</li>
                            <li>
                                внедрение автоматизации всех процессов на базе системы управления
                                предприятием ERP, позволяющей осуществлять контроль на всех этапах
                                производства;
                            </li>
                            <li>
                                профессионализм, ответственность и увлеченность наших сотрудников
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* nexblock */}

            <div className="container mx-auto px-4 max-w-[1200px]">
                <div className="flex justify-center items-center font-xl text-5xl">
                    <h1 className="text-center">
                        Мы придерживаемся принципов{' '}
                        <p className="text-primary_green text-center">&quot;Бережливого производства&quot;</p>
                    </h1>
                </div>
                <div className="flex flex-col lg:flex-row justify-center items-center my-10">
                    <div className="flex flex-col lg:w-2/8 lg:space-y-6 text-lg lg:text-right">
                        {lean.map(elem => {
                            return (
                                <div key={elem.title} className="flex flex-row-reverse lg:flex-row justify-end items-center  space-x-2 space-x-reverse lg:space-x lg:space-x-4">
                                    <p className="">
                                        {elem.title}
                                    </p>
                                    <Image
                                        src={elem.src}
                                        width={80}
                                        height={80}
                                        alt="box"
                                        className=""
                                    />
                                </div>
                            )
                        })}
                    </div>
                    <div className="lg:min-w-[520px] mx-5 my-5 lg:my-0">
                        <Image
                            src="/manufacture/conveer.png"
                            alt="Конвейер Onestep"
                            width={540}
                            height={750}
                            className="shadow-lg rounded-md"
                        />
                    </div>
                    <div className="flex flex-col lg:w-2/8 lg:space-y-6 text-lg text-left">
                        {lean2.map(elem => {
                            return (
                                <div key={elem.title} className="flex justify-start items-center  space-x-2 space-x lg:space-x-4">
                                    <Image src={elem.src} width={80} height={80} alt="box" />
                                    <p>{elem.title}</p>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* nexblock */}
            <div className="container mx-auto px-4 max-w-[1200px]">
                <h1 className="text-5xl font-semibold text-left mb-10 mt-2">
                    <span className="text-primary_green">Ключевые</span> моменты
                </h1>
            </div>
            {/* nexblock */}
            <div className="bg-gray-100 py-10">
                <div className="container mx-auto px-4 max-w-[1200px]">
                    <div className="flex flex-col lg:flex-row justify-center space-x-10">
                        <div className="flex justify-center lg:w-1/2">
                            <div className="grid grid-cols-2 gap-5">
                                {cleanZoneImg.map(el => (
                                    <Image
                                        key={el.src}
                                        src={el.src}
                                        width={300}
                                        height={300}
                                        className="shadow-lg rounded-md"
                                    />
                                ))}
                            </div>
                        </div>
                        <div className="flex flex-col items-center lg:items-start lg:w-1/2 text-lg justify-center">
                            <h2 className="text-4xl font-semibold mb-5 mt-4 lg:mt-0">
                                Чистая зона
                            </h2>
                            <p>Наличие чистой зоны на нашем производстве регламентировано:</p>
                            <ul className="list-disc list-inside text-center lg:text-left">
                                <li className="font-bold">ИСО 7-8 класс чистоты</li>
                                <li>
                                    ГОСТ Р ИСО 14644-1-2002 «Чистые помещения и связанные с ними
                                    контролируемые среды, часть 1. Классификация чистоты воздуха»
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
            <div id="storage" className='bg-gray-100 pt-5'>
                <div className=' bg-body_bg pb-10'></div>
            </div>
            {/* nexblock */}

            <div className="container mx-auto px-4 max-w-[1200px] pb-10">
                <div className="flex justify-center flex-col lg:flex-row space-y-10 lg:space-y-0 lg:space-x-10">
                    <div className="flex-1 flex flex-col">
                        <h1 className="text-5xl text-txtGreen">Сырье и материалы</h1>
                        <br />
                        <hr className="h-1.5 w-24 bg-txtGreen" />
                        <br />
                        <p className="text-2xl text-txtGreen">
                            Качество готовой продукции, в первую очередь, зависит от качества сырья,
                            из которого ее производят.
                        </p>
                        <br />
                        <p className="text-2xl text-txtGreen">
                            Именно поэтому, мы уделяем особое внимание выбору поставщиков и
                            производителей материалов и медицинских изделий для нашей продукции.
                        </p>
                        <br />
                        <p className="text-2xl text-txtGreen">
                            Среди них - ведущие мировые компании, лидеры по производству
                            медицинского текстиля, одноразовых компонентов для хирургических наборов
                            и т.д.
                        </p>
                        <br />
                        <p className="text-2xl text-txtGreen">
                            Наши перевязочные материалы выполнены из традиционной марли высокого
                            качества (100 % хлопок), обладающей прекрасными сорбционными свойствами,
                            воздухопроницаемы и безопасны для пациента, с плотностью 17 и 20 нитей
                            на квадратный сантиметр.
                        </p>
                        <br />
                        <p className="text-2xl text-txtGreen">
                            Все материалы и компоненты, использующиеся в нашем производстве, имеют
                            сертификат качества EC Certificate (о соответствии системы менеджмента
                            качества и технической документации на продукцию европейским стандартам
                            для медицинских изделий).
                        </p>
                    </div>
                    <div className="flex-1 self-center">
                        <Image
                            src="/manufacture/materials.jpg"
                            alt="Neoset"
                            width={1980}
                            height={1240}
                            className="shadow-lg rounded-md"
                        ></Image>
                    </div>
                </div>
            </div>

            {/* nexblock */}
            <div className="bg-gray-100">
                <div className="container mx-auto px-4 max-w-[1200px] py-10">
                    <div className="flex justify-center items-center flex-col lg:flex-row space-y-10 lg:space-y-0 lg:space-x-14">
                        <div className="flex lg:w-6/12">
                            <Image
                                src="/manufacture/sklad.jpg"
                                alt="Neoset"
                                width={1920}
                                height={1080}
                                className="object-cover shadow-lg rounded-md h-[500px]"
                            ></Image>
                        </div>
                        <div className="flex lg:w-6/12 flex-col">
                            <h1 className="text-5xl text-txtGreen">Склад и логистика</h1>
                            <br />
                            <hr className="h-1.5 w-24 bg-txtGreen" />
                            <br />
                            <p className="text-2xl text-txtGreen">
                                Складские мощности позволяют обеспечить производство сырьем на
                                несколько месяцев бесперебойной работы.
                            </p>
                            <br />
                            <p className="text-2xl text-txtGreen">
                                Также, возможности складского хранения позволяют иметь в наличии
                                достаточное количество готовой продукции, необходимой для наших
                                заказчиков.
                            </p>
                            <br />
                            <p className="text-2xl text-txtGreen">
                                Благодаря внедренной на производстве системе учета и контроля ERP,
                                имеется возможность планировать складское хранение, а также
                                регулировать сроки и стабильность поставки товара заказчику.
                            </p>
                        </div>
                    </div>
                </div>

            </div>
            {/* nexblock */}

            <div id="sterility" className='bg-gray-100 pt-3'>
                <div className=' bg-body_bg pb-12'></div>
            </div>

            <div className="container mx-auto px-4 max-w-[1200px] pb-10">
                <div className="flex justify-center  items-center flex-col lg:flex-row space-y-10 lg:space-y-0 lg:space-x-10">
                    <div className="flex w-6/12 flex-col">
                        <h1 className="text-5xl text-txtGreen">
                            Упаковка: стерильность и безопасность.
                        </h1>
                        <br />
                        <hr className="h-1.5 w-24 bg-txtGreen" />
                        <br />
                        <p className="text-2xl text-txtGreen">
                            Упаковка наборов NeoSet выполнена из твердого материала, обеспечивающего
                            безопасность хранения и транспортировки.
                        </p>
                        <div className="text-2xl text-txtGreen">
                            {' '}
                            Выполняет следующие функции:
                            <ul className="list-inside list-disc pl-4 leading-normal">
                                <li>
                                    систематизирующую - распределению составных элементов комплекта;
                                </li>
                                <li>
                                    сортировочную - позволяет отделять чистый материал от
                                    использованного;
                                </li>
                                <li>
                                    функцию одноразовых емкостей - может вмещать до двух разных
                                    видов жидкостей.
                                </li>
                            </ul>
                        </div>
                        <br />
                        <div className="text-2xl text-txtGreen">
                            Безопасность и простота в использовании. Cкругленные углы позволяют
                            избежать:
                            <ul className="list-inside list-disc pl-4 leading-normal">
                                <li>риска пораниться во время вскрытия;</li>
                                <li>
                                    риска повреждения соседней упаковки во время транспортировки и
                                    хранения.
                                </li>
                            </ul>
                        </div>
                        <br />
                        <p className="text-2xl text-txtGreen">
                            Сохранение стерильности упаковки гарантировано в течение всего срока
                            хранения.
                        </p>
                    </div>
                    <div className="flex w-6/12">
                        <Image
                            src="/manufacture/steril.jpg"
                            alt="Neoset"
                            width={1920}
                            height={1080}
                            className="object-cover shadow-lg rounded-md h-[600px] "
                        ></Image>
                    </div>
                </div>

            </div>

            {/* nexblock */}

            <div className="bg-gray-100 py-10">
                <div className="container mx-auto px-4 max-w-[1200px]">
                    <div className="flex justify-center flex-col lg:flex-row">
                        <div className="flex-1 flex flex-col lg:items-center">
                            <h1 className=" text-txtGreen text-5xl font-semibold whitespace-nowrap w-[420px] pt-1">
                                О стерилизации
                            </h1>
                            <p className="text-gray-600 font-semibold lg:text-center text-sm lg:w-[420px] mt-5">
                                Производится на базе Сибирского центра электронно-лучевой обработки,
                                наукоград Кольцово.
                            </p>
                            <br />
                        </div>
                        <div className="flex-1">
                            <p className="text-2xl text-txtGreen">
                                Наша продукция проходит процедуру стерилизации методом
                                электронно-лучевой обработки. Данную технологию иначе еще называют
                                холодной пастеризацией (так как эффект достигается без повышения
                                температуры).
                            </p>{' '}
                            <br />
                            <p className="text-2xl text-txtGreen">
                                На данный момент это самый безопасный и экологически чистый метод,
                                обеспечивающий не только полную стерильность готовой продукции,
                                инструмента, рабочего материала, сырья, но и существенно повышающий
                                сроки годности.
                            </p>
                            <br />
                            <ul className="list-disc list-inside text-2xl text-txtGreen">
                                <li className="list-none">Преимущества метода:</li>
                                <li>Изделия при облучении не нагреваются и не намокают;</li>
                                <li>Изделия можно использовать сразу после облучения;</li>
                                <li>
                                    Относительно низкая стоимость радиационной обработки, что
                                    отражается на себестоимости готовой продукции;
                                </li>
                                <li>
                                    Стерилизованное сырье может сохраняться в несколько раз дольше,
                                    чем при стерилизации термической – с помощью высоких температур
                                    и химической – с помощью различных реагентов.
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
            <ConnectUs title='Мы открыты для новых проектов и сотрудничества' txtbutton="Связаться со специалистом" />
        </>
    )
}
