import Link from "next/link"
import ConnectUs from "@/components/ConnectUs"

export const metadata = {
    title: "Документы",
    description:
        "Российский производитель медицинских одноразовых перевязочных материалов и процедурных стерильных наборов",
}

export default function Documentation() {
    return (
        <>
            <div className='container mx-auto max-w-[1200px] px-4'>
                <h1 className='m-10 text-5xl font-semibold text-txtGreen'>Документы</h1>

                <div className='mt-10 rounded-2xl bg-white px-10 pb-6 pt-3 md:px-5 lg:mx-10'>
                    <h2 className='text-3xl font-semibold leading-loose text-txtGreen'>
                        Разрешительные документы
                    </h2>
                    <div className='flex items-center justify-between space-x-8 md:pl-5'>
                        <div className='w-10/12'>
                            <p className='text-lg leading-loose text-txtGreen'>
                                Сертификат соответствия ISO 9001:2015
                            </p>
                        </div>
                        <div className='flex w-1/12 justify-center'>
                            <p className='text-lg leading-loose text-txtGreen'>PDF</p>
                        </div>
                        <div className='flex w-1/12 justify-between'>
                            <Link
                                href='/files/iso_9001_2015.pdf'
                                className='text-lg leading-loose text-mainGreen hover:text-txtGreen'
                            >
                                Скачать
                            </Link>
                        </div>
                    </div>
                    <div className='flex items-center justify-between space-x-8 md:pl-5'>
                        <div className='w-10/12'>
                            <p className='text-lg leading-loose text-txtGreen'>
                                Сертификат соответствия №ЕАС.04ИБН1.СМ.9574
                            </p>
                        </div>
                        <div className='flex w-1/12 justify-center'>
                            <p className='text-lg leading-loose text-txtGreen'>PDF</p>
                        </div>
                        <div className='flex w-1/12 justify-between'>
                            <Link
                                href='/'
                                className='text-lg leading-loose text-mainGreen hover:text-txtGreen'
                            >
                                Скачать
                            </Link>
                        </div>
                    </div>
                </div>

                <div className='my-10 rounded-2xl bg-white px-10 pb-6 pt-3 md:px-5 lg:mx-10'>
                    <h2 className='text-3xl font-semibold leading-loose text-txtGreen'>Разное</h2>
                    <div className='flex items-center justify-between space-x-8 md:pl-5'>
                        <div className='w-10/12'>
                            <p className='text-lg leading-loose text-txtGreen'>
                                ФЗ от 21.11.2011 N 323-ФЗ (ред. от 28.12.2022) &quot;Об основах
                                охраны здоровья граждан в Российской Федерации
                            </p>
                        </div>
                        <div className='flex w-1/12 justify-center'>
                            <p className='text-lg leading-loose text-txtGreen'>PDF</p>
                        </div>
                        <div className='flex w-1/12 justify-between'>
                            <Link
                                href='/'
                                className='text-lg leading-loose text-mainGreen hover:text-txtGreen'
                            >
                                Скачать
                            </Link>
                        </div>
                    </div>
                    <div className='flex items-center justify-between space-x-8 md:pl-5'>
                        <div className='w-10/12'>
                            <p className='text-lg leading-loose text-txtGreen'>
                                Приказ Минздрава России от 15.11.2012 N 919н (ред. от 14.09.2018)
                                &quot;Об утверждении Порядка оказания медицинской помощи взрослому
                                населению по профилю &quot;анестезиология и реаниматология
                            </p>
                        </div>
                        <div className='flex w-1/12 justify-center'>
                            <p className='text-lg leading-loose text-txtGreen'>PDF</p>
                        </div>
                        <div className='flex w-1/12 justify-between'>
                            <Link
                                href='/files/Order_of_the_Ministry_of_Health_of_Russia_N_919n.pdf'
                                className='text-lg leading-loose text-mainGreen hover:text-txtGreen'
                            >
                                Скачать
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
            <div className='mt-36'>
                <ConnectUs
                    title='Мы готовы обсудить возникшие вопросы'
                    txtbutton='Связаться со специалистом'
                />
            </div>
        </>
    )
}
