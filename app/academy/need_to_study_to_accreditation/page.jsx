import Link from "next/link"
import Image from "next/image"

export default function needStudyToAccreditation() {
    return (
        <>
            <div className="container mx-auto max-w-[1200px] px-10 my-8">
                <div className="space-y-4">
                    <h1 className="font-semibold text-2xl">Сколько часов нужно отучиться для допуска к аккредитации?</h1>
                    <h2 className="text-xl">Сколько часов нужно отучиться для допуска к аккредитации?</h2>
                    <Image
                        src='/academy/nurse.jpg'
                        alt='Nurses'
                        width={1920}
                        height={1080}
                        className='m-2 h-[250px] w-[350px] rounded-xl object-cover shadow-lg md:float-right'
                    ></Image>
                    <p>С 1 марта 2022 года до 1 марта 2023 года, чтобы получить допуск к периодической аккредитации, нужно набрать 144 часа через программы повышения квалификации (<Link href="https://docs.google.com/document/d/1x9x98RkmqX5_Gw62IXZBMmdWI-ct6UALb1rBwPKk-fo/edit" className="text-mainGreen">приказ Минздрава от 22.11.2021 № 1081н)</Link>.</p>
                    <p>Это может быть очное обучение длительностью 144 часа либо 74 часа освоения программ повышения квалификации плюс обучение на портале НМО длительностью не менее 70 часов за отчетный период.</p>
                    <p>При этом неважно, набирали ли вы образовательные часы равномерно или нет. Если вы четыре года не набирали часы, а за пятый набрали сразу все необходимые, до процедуры аккредитации вас допустят без ограничений.</p>
                    <p>Накопленные ЗЕТ в системе НМО можно использовать для прохождения аккредитации по двум и более специальностям.</p>
                    <p>В рекомендациях по обучению в рамках непрерывного образования, которые размещены на портале НМО, 1 ЗЕТ эквивалентна одному академическому часу.</p>
                </div>
            </div>
        </>
    )
}