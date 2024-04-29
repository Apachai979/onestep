// 'use client'
import Image from "next/image"
import Link from "next/link"
import { HiMiniArrowLongRight } from "react-icons/hi2";
import { BsCheckLg } from "react-icons/bs";
import NavPartners from "@/components/NavPartners";
import Block from "@/components/Block";

export const metadata = {
    title: 'Главному врачу',
    description: 'Российский производитель медицинских одноразовых перевязочных материалов и процедурных стерильных наборов',
}

const arrControlTask = [
    { title: 'Бережливые технологии в вашей клинике', description: 'Применение наборов NeoSet полностью отвечают задачам федерального проекта «Новая модель медицинской организации" по внедрению бережливых технологий в здравоохранении.', info: 'Подробнее', href: 'leantechnologies' },
    { title: 'Снижение трудозатрат', description: 'Экономия времени персонала на рутинные манипуляции повышает эффективность работы подразделения. Возможность проведения медицинских манипуляций без ассистента.', info: 'Пример', href: 'fallcost' },
    { title: 'Снижение затрат на стерилизацию', description: 'Высокотемпературная стерилизация способом автоклавирования - надежный, но затратный метод. При использовании готовых стерильных наборов - экономия очевидна.', info: 'Подробнее', href: 'sterilizationcosts' },
    { title: 'Профилактика ИСМП', description: 'Борьба с распространением инфекций, связанных с оказанием медицинской помощи, значительно эффективнее с внедрением готовых стерильных наборов.', info: 'Подробнее', href: 'ismp' },
    { title: 'Учет, контроль и документирование', description: 'Процессы учета расходных материалов, медицинских манипуляций и их документирование сведены к минимуму.', info: 'Подробнее', href: 'control' },
    { title: 'Безопасное хранение и утилизация', description: 'Надежность стерильной упаковки и гарантия производителя позволяют не думать о безопасности хранения готовых стерильных наборов. Процесс утилизации сводится к минимуму.', info: 'Подробнее', href: 'safebox' }
]

const arrProducts = [
    { name: 'Набор для снятия швов', href: '/catalogs/dlya-snyatiya-shvov' },
    { name: 'Набор для обработки ран', href: '/catalogs/dlya-obrabotki-ran' },
    { name: 'Набор для забора донорской крови', href: '/catalogs/dlya-zabora-donorskoj-krovi' },
    { name: 'Набор для забора крови из вены', href: '/catalogs/dlya-zabora-krovi-iz-veny' },
    { name: 'Набор для катетеризации мочевого пузыря', href: '/catalogs/dlya-kateterizacii-mochevogo-puzyrya' },
    { name: 'Набор для катетеризации центральных вен', href: '/catalogs/dlya-kateterizacii-centralnyh-ven' },
    { name: 'Набор для локальной анестезии', href: '/catalogs/dlya-lokalnoj-anestezii' },
    { name: 'Набор для гемодиализа', href: '/catalogs/dlya-gemodializa' },
]

const arrFlow = [
    { title: 'Хирургия', has: [1, 1, 0, 0, 0, 0, 0, 0] },
    { title: 'Травматология', has: [1, 1, 0, 1, 0, 0, 1, 0] },
    { title: 'Урология', has: [0, 0, 0, 0, 1, 0, 1, 0] },
    { title: 'Акушерство/ Гинекология', has: [1, 0, 0, 0, 1, 1, 1, 0] },
    { title: 'Анестезиология/ реаниматология', has: [0, 0, 0, 1, 1, 1, 1, 0] },
    { title: 'Трансфузиология/ нефрология', has: [0, 0, 1, 1, 0, 0, 0, 1] },
    { title: 'Лабораторная диагностика', has: [0, 0, 0, 1, 0, 0, 0, 0] }
]

export default function Doctors() {

    return (
        <>
            <div className='container mx-auto px-4 max-w-[1200px] py-10'>
                <h1 className="text-4xl font-semibold py-6 text-center sm:text-left">Главному врачу клиники</h1>
                <div className="flex items-center space-x-10 ">
                    <Image
                        src="/doctors/headdoctor.jpg"
                        alt="Neoset"
                        className="object-cover object-bottom w-1/3 h-[250px] rounded-3xl shadow-sm"
                        width={1280}
                        height={720}
                        priority></Image>
                    <div className="w-2/3">
                        <p className="text-lg">Задача руководителя медицинского учреждения – контролировать эффективность процессов, происходящих в клинике.
                            Качество и уровень работы лечебного учреждения зависят от многих составляющих: экономии бюджетных средств, оптимизации трудовых затрат, квалификации персонала, применения передовых технологий, использования современных материалов при медицинских манипуляциях и многих других.
                            Одним из элементов, позволяющим улучшить показатели эффективности, может стать использование готовых стерильных процедурных наборов.</p>
                    </div>
                </div>
            </div>
            <div className="bg-gray-200 py-10">
                <div className='container mx-auto px-4 max-w-[1200px]'>
                    <div className="md:text-right text-center">
                        <h1 className="text-3xl font-semibold pb-1">Возможности <span className="text-primary_green">для решения</span> управленческих задач</h1>
                        <p className="text-xl">с внедрением готовых cтерильных <br />процедурных наборов NeoSet</p>
                    </div>
                    <div className="flex mt-8">
                        <div className="grid  md:grid-cols-2 lg:grid-cols-3 lg:gap-10 gap-8 ">
                            {arrControlTask.map((elem) => {
                                return (
                                    <Link key={elem.title} href={`/partners/doctors/${elem.href}`} scroll={false} className=" flex group">
                                        <div className="flex flex-col justify-between bg-white rounded-3xl shadow-md p-6 group-hover:bg-gray-100 transition duration-200 ease-in h-full">
                                            <div>
                                                <h2 className="text-lg font-semibold pb-3">
                                                    {elem.title}
                                                </h2>
                                                <p className="text-lg">{elem.description}</p>
                                            </div>
                                            <div className="flex items-center pt-4 ">
                                                <p className=" text-base text-primary_green transition duration-200 ease-in group-hover:scale-105">{elem.info}</p> <HiMiniArrowLongRight size={26} className="fill-primary_green pt-1" />
                                            </div>
                                        </div>
                                    </Link>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </div >

            <Block>
                <div className="py-8">
                    <h1 className="text-3xl pb-5">Где применяются наборы <span className="text-primary_green">NeoSet</span></h1>
                    <div className="rounded-2xl overflow-hidden ">
                        <table className="table-auto text-left">
                            <thead>
                                <tr className="border border-b-gray-600 border-t-0 border-l-0 border-r-0">
                                    <th className="px-2">Набор NeoSet для:</th>
                                    {arrProducts.map((el) => {
                                        return (
                                            <th key={el.name} className="px-2 text-primary_green font-semibold" >
                                                <Link href={el.href}>
                                                    {el.name}
                                                </Link></th>
                                        )
                                    })}
                                </tr>
                            </thead>
                            <tbody className="">
                                {arrFlow.map((el) => {
                                    return (
                                        <tr key={el.title} className=" border border-b-gray-300 border-t-0 border-l-0 border-r-0 last:border-0 odd:bg-white even:bg-slate-50 text-base">
                                            <td className="pt-1 pb-2 pl-4 ">{el.title}</td>
                                            {el.has.map((elem, index) => {
                                                return (
                                                    <td key={index} className="">
                                                        <div className="flex justify-center">
                                                            {elem === 1 && <BsCheckLg />}
                                                        </div></td>
                                                )
                                            })}
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </Block >

            <NavPartners />
        </>
    )
}