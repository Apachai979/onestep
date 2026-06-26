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
            <div className="container mx-auto max-w-[1200px] px-2 sm:px-4">
                <h1 className="m-4 sm:m-10 text-4xl sm:text-5xl font-semibold text-txtGreen">Документы</h1>

                <div className="mt-5 sm:mt-10 rounded-2xl bg-white px-6 sm:px-10 pb-6 pt-3 md:px-5 lg:mx-10">
                    <h2 className="text-2xl sm:text-3xl font-semibold sm:leading-loose text-txtGreen -translate-x-3 sm:translate-x-0">Разрешительные документы</h2>

                    {[
                        { title: "Сертификат соответствия ISO 9001:2015", link: "/files/iso_9001_2015.pdf" },
                        { title: "Сертификат соответствия №ЕАС.04ИБН1.СМ.9574", link: "/" }
                    ].map((doc, index) => (
                        <div key={index} className="flex flex-wrap md:flex-nowrap items-center justify-between gap-2 sm:gap-x-4 md:pl-5 mt-3">
                            <div className="w-9/12 sm:max-w-[95%]">
                                <p className="text-lg leading-tight sm:leading-loose text-txtGreen">{doc.title}</p>
                            </div>
                            <div className="flex w-2/12 justify-center">
                                <p className="text-lg leading-tight sm:leading-loose text-txtGreen">PDF</p>
                            </div>
                            <div className="flex w-2/12 justify-end">
                                <Link href={doc.link} className="text-lg leading-tight sm:leading-loose text-mainGreen hover:text-txtGreen">
                                    Скачать
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="my-10 rounded-2xl bg-white px-6 sm:px-10 pb-6 pt-3 md:px-5 lg:mx-10">
                    <h2 className="text-2xl sm:text-3xl font-semibold leading-tight sm:leading-loose text-txtGreen -translate-x-3 sm:translate-x-0">Разное</h2>

                    {[
                        {
                            title: "ФЗ от 21.11.2011 N 323-ФЗ (ред. от 28.12.2022) \"Об основах охраны здоровья граждан в Российской Федерации\"",
                            link: "/"
                        },
                        {
                            title: "Приказ Минздрава России от 15.11.2012 N 919н (ред. от 14.09.2018) \"Об утверждении Порядка оказания медицинской помощи взрослому населению по профилю \"анестезиология и реаниматология\"",
                            link: "/files/Order_of_the_Ministry_of_Health_of_Russia_N_919n.pdf"
                        }
                    ].map((doc, index) => (
                        <div key={index} className="flex flex-wrap md:flex-nowrap items-center justify-between gap-2 sm:gap-x-4 md:pl-5 mt-3">
                            <div className="w-9/12 sm:max-w-[95%]">
                                <p className="text-lg leading-tight sm:leading-loose text-txtGreen">{doc.title}</p>
                            </div>
                            <div className="flex w-2/12 justify-center">
                                <p className="text-lg leading-tight sm:leading-loose text-txtGreen">PDF</p>
                            </div>
                            <div className="flex w-2/12 justify-end">
                                <Link href={doc.link} className="text-lg leading-tight sm:leading-loose text-mainGreen hover:text-txtGreen">
                                    Скачать
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="sm:mt-36">
                <ConnectUs title="Мы готовы обсудить возникшие вопросы" txtbutton="Связаться со специалистом" />
            </div>


        </>
    )
}
