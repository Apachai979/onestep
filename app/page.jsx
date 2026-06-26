import Link from "next/link"
import Image from "next/image"
import Carousel from "@/components/Carousel"
import WeWorkFor from "@/components/WeWorkFor"
import ConnectWithUs from "@/components/ConnectWithUs"
import AuthComponent from "@/components/AuthComponent"

export const metadata = {
    title: "Компания OneStep",
    description:
        "Российский производитель медицинских одноразовых перевязочных материалов и процедурных стерильных наборов",
}

const partners = [
    { src: '/home/partners/partner1.jpeg', alt: 'НИИ Кардиологии' },
    { src: '/home/partners/partner2.png', alt: 'НИИ Онкологии' },
    { src: '/home/partners/partner3.jpeg', alt: 'ТОКБ' },
    { src: '/home/partners/partner4.png', alt: 'Сибирский государственный медицинский университет' },
];

const features = [
    {
        title: "Мировые стандарты качества",
        img: "/home/img1.jpg",
        points: [
            "контроль качества на всех этапах производства",
            "имеется сертификат соответствия требованиям ГОСТ Р ИСО 9001-2015 (ISO-9001:2015)",
            "лучшие поставщики комплектующих",
        ],
    },
    {
        title: "Удобство и функциональность",
        img: "/home/img4.jpg",
        points: [
            "Наши наборы:",
            "готовы к применению",
            "оптимальны по составу",
            "эргономика укладки соответствует стандарту операционных процедур",
            "упаковка совмещена с контейнером для дезсредства",
        ],
    },
    {
        title: "Безопасность и надежность",
        img: "/home/img3.jpg",
        points: [
            "100%-я стерильность",
            "гарантия защиты от внутрибольничных инфекций",
            "прочная несминаемая упаковка",
        ],
    },
    {
        title: "Экономия времени и средств",
        img: "/home/img2.jpg",
        points: [
            "Использование наших наборов позволит:",
            "сократить время подготовки к процедуре на 30%",
            "уменьшить количество и трудозатраты персонала",
            "повысить эффективность оказания помощи пациенту",
        ],
    },
];

export default function Home() {
    return (
        <>
            {/* <AuthComponent /> */}

            <Carousel />

            {/* nextblock */}

            <h1 className='container mx-auto p-x-4 my-14 text-center text-3xl font-semibold text-night_green'>
                OneStep —{" "}
                <span className='text-primary_green'>
                    российский производитель медицинских <br /> одноразовых перевязочных материалов
                    и процедурных <br />
                    стерильных наборов
                </span>
            </h1>

            {/* nextblock */}
            <div className="container mx-auto px-4">
                <div className="flex justify-center">
                    <div className="grid gap-6 sm:gap-10 lg:grid-cols-2 lg:gap-12">
                        {features.map((feature, index) => (
                            <div
                                key={feature.id} // Используйте уникальный идентификатор, если он доступен
                                className="relative h-72 w-96 cursor-pointer overflow-hidden rounded-2xl bg-white drop-shadow-md"
                            >
                                <div className="absolute w-full z-20 bg-white transition-opacity duration-500 hover:opacity-0 ">
                                    <div className="flex h-52">
                                        <Image
                                            src={feature.img}
                                            alt={feature.title}
                                            className="object-cover "
                                            width={1280}
                                            height={720}
                                            priority={index < 2} // Приоритет только для первых двух изображений
                                        />
                                    </div>
                                    <div className="flex h-20 justify-center items-center">
                                        <h2 className="text-center text-xl font-semibold text-night_green">
                                            {feature.title}
                                        </h2>
                                    </div>
                                </div>
                                <ul className="absolute inset-0 z-10 mx-10 py-5 list-inside list-disc text-lg font-semibold leading-relaxed text-txtMiddle">
                                    {feature.points.map((point, i) => (
                                        <li key={point.id} className={i === 0 && index === 1 || i === 0 && index === 3 ? "list-none pb-3" : ""}>
                                            {point}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* nextblock */}

            <WeWorkFor />

            {/* nextblock */}

            <div className='container mx-auto px-4'>
                <div className="flex justify-center">
                    <div className='flex max-w-[1000px] flex-col items-center justify-center space-y-5 rounded-3xl bg-white p-14 drop-shadow-lg lg:shrink lg:flex-row lg:space-y-0 xl:w-[1200px]'>
                        <div className='flex flex-1 justify-center'>
                            <Image
                                src='/home/worldexp.png'
                                alt='Neoset'
                                className='h-[330px] w-[330px] rounded-3xl object-cover object-center'
                                width={1280}
                                height={720}
                            ></Image>
                        </div>

                        <div className='flex flex-1 flex-col items-center justify-center space-y-5 mx-auto'>
                            <h2 className='text-justify text-xl sm:text-2xl font-semibold text-txtGreen lg:text-left'>
                                Мы опирались на{" "}
                                <span className='text-mainGreen'>лучший мировой опыт</span> производства
                                медицинских изделий и{" "}
                                <span className='text-mainGreen'>
                                    заложили основные принципы качества
                                </span>{" "}
                                и <span className='text-mainGreen'>удобства использования</span>. Так
                                появился OneStep.
                            </h2>
                            <Link
                                href='/about'
                                className='min-w-80 rounded-full border-[3px] border-mainGreen bg-white py-3 text-center text-xl sm:text-2xl text-mainGreen transition duration-300 hover:bg-mainGreen hover:text-white'
                            >
                                Подробнее компании
                            </Link>

                        </div>
                    </div>
                </div>
            </div>

            {/* nextblock */}
            <div className='bg-white min-w-full drop-shadow-sm my-4'>
                <div className='container mx-auto px-4'>
                    <div className='my-2 sm:my-8 flex flex-col items-center justify-center py-6 sm:py-10'>
                        <h1 className='text-center text-2xl sm:text-3xl font-semibold text-txtMiddle/50 lg:indent-96 lg:text-4xl'>
                            Мы оказываем поддержку{" "}
                            <span className='text-mainGreen'>гемодиализным центрам</span> Западной
                            Сибири и проектам в области медицинского образования
                            <svg
                                fill='none'
                                viewBox='0 0 24 24'
                                className='inline h-12 w-12 cursor-pointer fill-mainGreen stroke-txtGreen/30 stroke-1 transition-transform duration-700 hover:scale-125'
                            >
                                <path
                                    strokeLinecap='round'
                                    strokeLinejoin='round'
                                    d='M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z'
                                />
                            </svg>
                        </h1>
                        <Link
                            href='/about'
                            className='tracking-wide mt-4 rounded-full border-[3px] border-mainGreen bg-white px-10 py-3 text-center text-xl sm:text-2xl text-mainGreen transition duration-300 hover:bg-mainGreen hover:text-white lg:self-end'
                        >
                            Подробнее
                        </Link>
                    </div>
                </div>
            </div>

            {/* nextblock */}

            <div className='container mx-auto my-3 sm:my-5 px-4'>
                <h1 className='mb-5 text-center text-4xl font-semibold text-mainGreen'>
                    Наши <span className='text-txtGreen'>партнеры</span>
                </h1>
                <div className='flex flex-wrap justify-center lg:gap-0 '>
                    {partners.map((partner, index) => (
                        <div key={index} className='flex sm:h-28 w-72 items-center justify-center p-3'>
                            <Image
                                src={partner.src}
                                alt={partner.alt}
                                className='h-auto w-auto object-cover object-center'
                                width={160}
                                height={70}
                                priority
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* nextblock */}

            <ConnectWithUs
                title='Наш специалист ответит на ваши вопросы!'
                titleForForm='Задать вопрос специалисту:'
                textButton='Связаться с нами'
            />
        </>
    )
}
