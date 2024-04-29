import Image from "next/image"
import WithOrWithoutSet from "@/components/accordions/WithOrWithoutSet"
import Block from "@/components/Block"
import NavPartners from "@/components/NavPartners"
import AppTabs from '@/components/tabs/AppTabs'

export const metadata = {
    title: 'Специалисту',
    description: 'Российский производитель медицинских одноразовых перевязочных материалов и процедурных стерильных наборов',
}

export default function Specialist() {
    return (
        <>
            <div className='container mx-auto px-4 max-w-[1200px] py-10'>

                <div className="flex flex-col lg:flex-row lg:items-center">
                    <div className="lg:w-5/12 pr-8">
                        <h1 className="text-4xl font-semibold pb-6 text-center sm:text-left">Специалисту</h1>
                        <p className="text-xl">Медицинская сестра - олицетворение медицины. В самом ее звании заложена естественная близость с человеком, нуждающимся в помощи.</p>
                        <p className="text-xl text-gray-500 pt-6">Медицинская сестра - первая, кого встречает пациент в клинике. С ней он плотнее всего взаимодействует на пути к выздоровлению. Как максимально облегчить работу той, на ком лежит вся тяжесть заботы о пациенте?</p>
                        <div className="lg:flex flex-col w-full hidden ">
                            <hr className="h-1 w-full bg-primary_green rounded-sm justify-end mt-4" />
                            <p className="text-2xl w-full">OneStep: помогаем медсестре решать рутинные задачи в один шаг</p>
                        </div>
                    </div>
                    <Image
                        src="/doctors/specialist/specialistmain.jpeg"
                        alt="Neoset"
                        className="object-cover object-bottom lg:w-7/12 lg:h-[420px] rounded-3xl shadow-sm lg:py-1 pt-3"
                        width={1280}
                        height={720}
                        priority></Image>
                    <div className="flex flex-col w-full lg:hidden">
                        <hr className="h-1 w-full bg-primary_green rounded-sm justify-end mt-4" />
                        <p className="text-2xl w-full">OneStep: помогаем медсестре решать рутинные задачи в один шаг</p>
                    </div>
                </div>

                <div className="flex justify-end">

                </div >
            </div>
            <div className=" bg-gray-200 py-10">
                <Block>
                    <div className="flex flex-col md:flex-row ">
                        <div className="flex flex-col md:w-5/12 pr-10 items-center md:items-start">
                            <Image
                                src="/doctors/specialist/comfort.png"
                                alt="Neoset"
                                className="object-cover object-bottom h-[280px] rounded-3xl shadow-sm py-1 w-[445px]"
                                width={1280}
                                height={720}
                                priority>

                            </Image>
                            <h1 className="text-3xl hidden md:block"><p>Удобство</p><p>Эффективность</p><p>Безопасность</p></h1>
                            <h1 className="text-3xl block md:hidden pb-2">Удобство Эффективность Безопасность</h1>
                        </div>
                        <div className="md:w-7/12">
                            <p className="text-2xl pb-2">Готовые процедурные наборы - <span className="text-primary_green">это забота</span>:</p>
                            <ul className="text-xl list-disc list-inside">
                                <li><span className="text-primary_green">О времени</span> медицинской сестры. Теперь не нужно тратить драгоценные часы на бесконечное изготовление перевязочных материалов и формирование укладок, можно уделять гораздо больше внимания пациентам.</li>
                                <li><span className="text-primary_green">О трудозатратах</span> медицинской сестры. Можно уменьшить физическую нагрузку от рутинной работы, сберечь силы для работы с пациентами.</li>
                                <li><span className="text-primary_green">О руках</span> медсестры. Упаковка наборов выполнена с закругленными уголками, чтобы уберечь руки от порезов при вскрытии.</li>
                                <li><span className="text-primary_green">О здоровье</span> медсестры. Риск заражения ВБИ как пациентов, так и персонала значительно снижается при использовании готовых стерильных наборов.</li>
                            </ul>
                        </div>
                    </div>
                </Block >

                <Block>
                    <div className="flex pt-10 flex-col-reverse md:flex-row">
                        <div className="text-xl space-y-5 md:w-7/12">
                            <p>Почему до сих пор во многих медицинских организациях делают выбор в пользу самостоятельного изготовления процедурных наборов?</p>
                            <p>Причины, которые чаще всего называют: привычнее, дешевле (хотя, мало кто сравнивал), нет времени на освоение нового.</p>
                            <p>Те же, кто попробовал на практике использовать готовые процедурные наборы, говорят что уже не представляют без них свою работу.</p>
                            <p>Попробуем разобраться: в чем разница между &quot;традиционным&quot; подходом и подходом с применением готовых наборов, согласно этапам медицинской процедуры</p>
                        </div>
                        <div className="flex flex-col items-center md:w-5/12 md:pl-10 ">
                            <Image
                                src="/doctors/specialist/complex.jpg"
                                alt="Neoset"
                                className="object-cover object-bottom h-[280px] rounded-3xl shadow-sm py-1 w-[445px]"
                                width={1280}
                                height={720}
                                priority>

                            </Image>
                            <h1 className="text-3xl text-center md:text-left pb-3 md:pb-0">Собирать самостоятельно или использовать готовые?</h1>

                        </div>
                    </div>
                </Block>
            </div>

            <WithOrWithoutSet />

            <AppTabs />

            <NavPartners />

        </>
    )
}