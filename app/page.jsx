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

export default function Home() {
    return (
        <>
            {/* <AuthComponent /> */}

            <Carousel />

            {/* nextblock */}

            <h1 className='mx my-14 text-center text-3xl font-semibold text-night_green'>
                OneStep —{" "}
                <span className='text-primary_green'>
                    российский производитель медицинских <br /> одноразовых перевязочных материалов
                    и процедурных <br />
                    стерильных наборов
                </span>
            </h1>

            {/* nextblock */}
            <div className='container mx-auto px-4'>
                {/* <div className='grid lg:grid-cols-2 place-items-center gap-y-8 xl:mx-28 2xl:mx-60 '> */}
                <div className='flex justify-center'>
                    <div className='grid gap-10 lg:grid-cols-2 lg:gap-12'>
                        <div className='relative h-[350px] w-[460px] cursor-pointer overflow-hidden rounded-2xl bg-white drop-shadow-md'>
                            <div className='absolute z-20 bg-white transition-opacity hover:opacity-0'>
                                <Image
                                    src='/home/img1.jpg'
                                    alt='Neoset'
                                    className='h-[250px] w-[460px] object-cover object-bottom'
                                    width={1280}
                                    height={720}
                                    priority
                                ></Image>
                                <h2 className='my-8 text-center text-2xl font-semibold text-night_green'>
                                    Мировые стандарты качества
                                </h2>
                            </div>
                            <ul className='absolute inset-0 z-10 m-10 list-inside list-disc text-xl font-semibold leading-relaxed text-txtMiddle'>
                                <li>контроль качества на всех этапах производства</li>
                                <li>
                                    имеется сертификат соответствия требованиям ГОСТ Р ИСО 9001-2015
                                    (ISO-9001:2015)
                                </li>
                                <li>лучшие поставщики комплектующих</li>
                            </ul>
                        </div>
                        <div className='relative h-[350px] w-[460px] cursor-pointer overflow-hidden rounded-2xl bg-white drop-shadow-md'>
                            <div className='absolute z-20 bg-white transition-opacity duration-500 hover:opacity-0'>
                                <Image
                                    src='/home/img4.jpg'
                                    alt='Neoset'
                                    className='h-[250px] w-[460px] object-cover object-bottom'
                                    width={1280}
                                    height={720}
                                    priority
                                ></Image>
                                <h2 className='my-8 text-center text-2xl font-semibold text-night_green'>
                                    Удобство и функциональность
                                </h2>
                            </div>
                            <ul className='absolute inset-0 z-10 m-10 list-inside list-disc text-xl font-semibold leading-relaxed text-txtMiddle'>
                                <li className='-mt-5 list-none pb-3'>Наши наборы:</li>
                                <li>готовы к применению</li>
                                <li>оптимальны по составу</li>
                                <li>
                                    эргономика укладки соответствует стандарту операционных процедур
                                </li>
                                <li>упаковка совмещена с контейнером для дезсредства</li>
                            </ul>
                        </div>
                        <div className='relative h-[350px] w-[460px] cursor-pointer overflow-hidden rounded-2xl bg-white drop-shadow-md'>
                            <div className='absolute z-20 bg-white transition-opacity duration-500 hover:opacity-0'>
                                <Image
                                    src='/home/img3.jpg'
                                    alt='Neoset'
                                    className='h-[250px] w-[460px] object-cover object-bottom'
                                    width={1280}
                                    height={720}
                                    priority
                                ></Image>
                                <h2 className='my-8 text-center text-2xl font-semibold text-night_green'>
                                    Безопасность и надежность
                                </h2>
                            </div>
                            <ul className='absolute inset-0 z-10 m-10 list-inside list-disc text-xl font-semibold leading-relaxed text-txtMiddle'>
                                <li>100% -я стерильность</li>
                                <li>гарантия защиты от внутрибольничных инфекций</li>
                                <li>прочная несминаемая упаковка</li>
                            </ul>
                        </div>
                        <div className='relative h-[350px] w-[460px] cursor-pointer overflow-hidden rounded-2xl bg-white drop-shadow-md'>
                            <div className='absolute z-20 bg-white transition-opacity duration-500 hover:opacity-0'>
                                <Image
                                    src='/home/img2.jpg'
                                    alt='Neoset'
                                    className='h-[250px] w-[460px] object-cover object-bottom'
                                    width={1280}
                                    height={720}
                                    priority
                                ></Image>
                                <h2 className='my-8 text-center text-2xl font-semibold text-night_green'>
                                    Экономия времени и средств
                                </h2>
                            </div>
                            <ul className='absolute inset-0 z-10 m-10 list-inside list-disc text-xl font-semibold leading-relaxed text-txtMiddle'>
                                <li className='-mt-5 list-none pb-3'>
                                    Использование наших наборов позволит:
                                </li>
                                <li>сократить время подготовки к процедуре на 30%</li>
                                <li>уменьшить количество и трудозатраты персонала</li>
                                <li>повысить эффективность оказания помощи пациенту</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            {/* nextblock */}

            <WeWorkFor />

            {/* nextblock */}

            <div className='container mx-auto flex justify-center px-4'>
                <div className='flex w-[1000px] flex-col items-center justify-center space-y-5 rounded-3xl bg-white p-14 drop-shadow-lg lg:shrink lg:flex-row lg:space-y-0 xl:w-[1200px]'>
                    <div className='flex flex-1 justify-center'>
                        <Image
                            src='/home/worldexp.png'
                            alt='Neoset'
                            className='h-[330px] w-[330px] rounded-3xl object-cover object-center'
                            width={1280}
                            height={720}
                        ></Image>
                    </div>
                    <div className='flex flex-1 flex-col items-center justify-center space-y-5'>
                        <h2 className='text-justify text-2xl font-semibold text-txtGreen lg:text-left'>
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
                            className='w-96 rounded-full border-[3px] border-mainGreen bg-white px-8 py-3 text-center text-2xl text-mainGreen transition duration-300 hover:bg-mainGreen hover:text-white'
                        >
                            Подробнее компании
                        </Link>
                    </div>
                </div>
            </div>

            {/* nextblock */}
            <div className='bg-white drop-shadow-sm'>
                <div className='container mx-auto px-4'>
                    <div className='my-10 flex flex-col items-center justify-center py-10'>
                        <h1 className='text-center text-3xl font-semibold text-txtMiddle/50 lg:indent-96 lg:text-4xl'>
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
                            className='mt-4 rounded-full border-[3px] border-mainGreen bg-white px-10 py-3 text-center text-2xl text-mainGreen transition duration-300 hover:bg-mainGreen hover:text-white lg:self-end'
                        >
                            Подробнее
                        </Link>
                    </div>
                </div>
            </div>

            {/* nextblock */}

            <div className='container mx-auto my-5 px-4'>
                <h1 className='mb-5 text-center text-4xl font-semibold text-mainGreen'>
                    Наши <span className='text-txtGreen'>партнеры</span>
                </h1>
                <div className='flex items-center justify-center lg:divide-x'>
                    <div className='flex h-[112px] w-[300px] items-center justify-center'>
                        <Image
                            src='/home/partners/partner1.jpeg'
                            alt='НИИ Кардиологии'
                            className='h-auto w-auto object-cover object-center'
                            width={160}
                            height={70}
                        ></Image>
                    </div>
                    <div className='flex h-[112px] w-[300px] items-center justify-center'>
                        <Image
                            src='/home/partners/partner2.png'
                            alt='НИИ Кардиологии'
                            className='h-auto w-auto object-cover object-center'
                            width={160}
                            height={70}
                        ></Image>
                    </div>
                    <div className='flex h-[112px] w-[300px] items-center justify-center'>
                        <Image
                            src='/home/partners/partner3.jpeg'
                            alt='НИИ Кардиологии'
                            className='h-auto w-auto object-cover object-center'
                            width={160}
                            height={70}
                        ></Image>
                    </div>
                    <div className='flex h-[112px] w-[300px] items-center justify-center'>
                        <Image
                            src='/home/partners/partner4.png'
                            alt='НИИ Кардиологии'
                            className='h-auto w-auto object-cover object-center'
                            width={160}
                            height={70}
                        ></Image>
                    </div>
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
