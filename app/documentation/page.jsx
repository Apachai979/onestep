import Link from "next/link"
import ConnectUs from "@/components/ConnectUs"

export const metadata = {
    title: 'Документы',
    description: 'Российский производитель медицинских одноразовых перевязочных материалов и процедурных стерильных наборов',
}

export default function Documentation() {
    return (
        <>
            <div className="container mx-auto max-w-[1200px] px-4 ">
                <h1 className="text-5xl text-txtGreen font-semibold m-10">Документы</h1>

                <div className="bg-white lg:mx-10 px-10 md:px-5 pt-3 pb-6 rounded-2xl mt-10">
                    <h2 className="text-3xl text-txtGreen font-semibold leading-loose">Разрешительные документы</h2>
                    <div className="flex justify-between items-center space-x-8 md:pl-5">
                        <div className="w-10/12">
                            <p className="text-lg text-txtGreen leading-loose">Сертификат соответствия ISO 9001:2015</p>
                        </div>
                        <div className="flex justify-center w-1/12">
                            <p className="text-lg text-txtGreen leading-loose">PDF</p>
                        </div>
                        <div className="flex justify-between w-1/12">
                            <Link href="/files/iso_9001_2015.pdf" className="text-lg text-mainGreen hover:text-txtGreen leading-loose">Скачать</Link>
                        </div>
                    </div>
                    <div className="flex justify-between items-center space-x-8 md:pl-5">
                        <div className="w-10/12">
                            <p className="text-lg text-txtGreen leading-loose">Сертификат соответствия №ЕАС.04ИБН1.СМ.9574</p>
                        </div>
                        <div className="flex justify-center w-1/12">
                            <p className="text-lg text-txtGreen leading-loose">PDF</p>
                        </div>
                        <div className="flex justify-between w-1/12">
                            <Link href="/" className="text-lg text-mainGreen hover:text-txtGreen leading-loose">Скачать</Link>
                        </div>
                    </div>
                </div>

                <div className="bg-white lg:mx-10 px-10 md:px-5 pt-3 pb-6 rounded-2xl my-10">
                    <h2 className="text-3xl text-txtGreen font-semibold leading-loose">Разное</h2>
                    <div className="flex justify-between items-center space-x-8 md:pl-5">
                        <div className="w-10/12">
                            <p className="text-lg text-txtGreen leading-loose">ФЗ от 21.11.2011 N 323-ФЗ (ред. от 28.12.2022) &quot;Об основах охраны здоровья граждан в Российской Федерации</p>
                        </div>
                        <div className="flex justify-center w-1/12">
                            <p className="text-lg text-txtGreen leading-loose">PDF</p>
                        </div>
                        <div className="flex justify-between w-1/12">
                            <Link href="/" className="text-lg text-mainGreen hover:text-txtGreen leading-loose">Скачать</Link>
                        </div>
                    </div>
                    <div className="flex justify-between items-center space-x-8 md:pl-5">
                        <div className="w-10/12">
                            <p className="text-lg text-txtGreen leading-loose">Приказ Минздрава России от 15.11.2012 N 919н (ред. от 14.09.2018) &quot;Об утверждении Порядка оказания медицинской помощи взрослому населению по профилю &quot;анестезиология и реаниматология</p>
                        </div>
                        <div className="flex justify-center w-1/12">
                            <p className="text-lg text-txtGreen leading-loose">PDF</p>
                        </div>
                        <div className="flex justify-between w-1/12">
                            <Link href="/files/Order_of_the_Ministry_of_Health_of_Russia_N_919n.pdf" className="text-lg text-mainGreen hover:text-txtGreen leading-loose">Скачать</Link>
                        </div>
                    </div>
                </div>
            </div>
            <div className="mt-96">
                <ConnectUs title='Мы готовы обсудить возникшие вопросы' txtbutton="Связаться со специалистом" />
            </div>
        </>
    )
}