import Block from "@/components/Block"
import Image from "next/image"
import NavPartners from "@/components/NavPartners"
import Accordion from "@/components/accordions/Accordion"

export const metadata = {
    title: 'Пациенту',
    description: 'Российский производитель медицинских одноразовых перевязочных материалов и процедурных стерильных наборов',
}

const arrTruster = [
    { title: 'Разрешительная документация организации', bodyf: 'На самом первом этапе выбора лаборатории (в том случае, когда выбор - именно за вами, а не за врачом), внимательно изучите сайт лаборатории (в современном мире отсутствие сайта уже внушает подозрения). Какую информацию можно получить с сайта?', bodys: 'Разрешительная документация организации. Какая лицензия у лаборатории, на что аккредитация? Лицензия разрешает заниматься лабораторной диагностикой. А аккредитация подтверждает соответствие определенным требованиям по выполнению анализов', bodyt: '' },
    { title: 'Оборудование', bodyf: 'Выясните - насколько оно современное и качественное, автоматизирована ли система исследования и имеется ли компьютерная система информации. Весь материал, забираемый у пациента должен по современным требованиям проходить маркировку способом баркодирования', bodys: '', bodyt: '' },
    { title: 'Расходные материалы', bodyf: 'Обратите внимание - какие инструменты и материалы использует лаборатория для работы с пациентами? В современной, заботящейся о безопасности пациентов организации, должны быть одноразовые стерильные, готовые к применению наборы и инструменты.', bodys: '', bodyt: '' },
    { title: 'Инструктаж перед забором анализа', bodyf: 'Для получения точных диагностических данных в результатах лабораторного анализа необходимо выполнение нескольких правил перед сдачей анализа.', bodys: 'В момент записи на анализ, представитель лаборатории должен вас подробно проинструктировать о том, в какое время вам необходимо явиться, чего не следует употреблять, нужно ли исключить физические и умственные нагрузки.', bodyt: 'Кроме того, вас могут попросить отложить физиотерапевтические процедуры, а также рентгенологические ультразвуковые исследования. Это подтверждает ответственный подход лаборатории, т.к. воздействие низкочастотного или высокочастотных излучений могут изменить гематологические показатели крови (снижается концентрация лейкоцитов, гемоглобина).' },
    { title: 'Отзывы', bodyf: 'Пожалуй, это первое, на что смотрят посетители сайтов. Обратите внимание не только на оценку вежливости персонала, но прежде всего - на то, какими методами берут анализы, дают ли проверять маркировку пробирок, используют ли одноразовые системы для взятия крови (например, Vaccuette) даже для ОАК (или, по старинке, берут кровь из пальца?)', bodys: '', bodyt: '' },

]

export default function Patient() {
    return (
        <>
            <Block>

                <div className="flex relative w-full h-auto justify-center items-center overflow-hidden rounded-3xl my-1">
                    <h1 className="absolute text-6xl font-semibold z-10 ">Пациенту</h1>
                    <div className="absolute w-full h-full backdrop-brightness-75 bg-white/10"></div>
                    <Image
                        src="/doctors/patient/mainpatient.png"
                        alt="Neoset"
                        className="object-cover object-bottom h-auto shadow-sm  mx-6 w-full"
                        width={1280}
                        height={720}
                        priority>
                    </Image>
                </div>
                <hr className="bg-primary_green w-full h-0.5 mt-2 mx-auto " />

                <div className="flex flex-col lg:flex-row my-6">
                    <div className="flex flex-col justify-center items-center lg:w-5/12 mx-24">
                        <Image
                            src="/doctors/patient/patient.jpg"
                            alt="Neoset"
                            className="object-cover object-bottom h-auto shadow-sm rounded-xl mx-6 w-full order-2 lg:order-1 mb-3 lg:mb-0"
                            width={1280}
                            height={720}>
                        </Image>
                        <h1 className="text-3xl text-center pt-2 pb-2 lg:pb-0 order-1 lg:order-2">Качество лечения зависит от качества инструментов и материалов</h1>
                    </div>
                    <div className="flex flex-col lg:w-7/12 text-xl">
                        <p className="pb-3">Качество медицинской помощи в лечебном учреждении зависит от того</p>
                        <ul className="list-disc list-inside pb-3">
                            <li><span className="text-primary_green">КТО</span> лечит? (Нам важен опыт, профессионализм, авторитет специалистов);</li>
                            <li><span className="text-primary_green">ЧТО</span> лечим? (Правильно поставленный диагноз - 90% успеха);</li>
                            <li><span className="text-primary_green">КАК</span> лечим? (Методы и средства, которые применяются в данном лечебном учреждении);</li>
                            <li><span className="text-primary_green">ЧЕМ</span> или с помощью <span className="text-primary_green">ЧЕГО</span> лечим? (Оснащение и оборудование лечебного учреждения).</li>
                        </ul>
                        <p className="pb-3">Инструментальные и материальные ресурсы клиники, которые имеются в распоряжении врачей и всего медицинского персонала, играют очень важную роль в лечения пациента. Они эффективно помогают специалистам повышать качество и уровень медицинской помощи, одновременно снижая негативное влияние человеческого фактора.</p>
                        <p>Именно поэтому пациенту стоит обращать внимание не только на то, кто и как оказывает помощь ему в лечебном учреждении, но и на применяемые в ходе процедур, инструменты и расходные материалы.</p>

                    </div>
                </div>

            </Block>

            <div className="bg-white py-8">
                <Block>
                    <div className="relative md:mx-24 ">

                        <div className="flex flex-col md:flex-row-reverse text-xl mx-auto space-x-12 space-x-reverse">

                            <div className="md:w-4/12">
                                <hr className="bg-primary_green h-0.5 lg:w-64 w-full " />
                                <h1 className="text-3xl text-black pt-4">Для чего нужны одноразовые стерильные наборы?</h1>
                            </div>
                            <div className="flex flex-col md:w-8/12 pt-3 ">
                                <p className="pb-2 text-primary_green">Одноразовые процедурные стерильные наборы обеспечивают санитарную чистоту в амбулаторно-стационарных условиях.</p>
                                <p>Они способствуют предотвращению заражения пациентов и медицинского персонала и служат важным средством борьбы с различного рода внутрибольничными инфекциями (ВБИ).</p>
                            </div>

                        </div>
                        <div className="text-xl mt-4">
                            <p className=""><span className="text-primary_green">Внутрибольничные инфекции</span> – это различные инфекционные заболевания, заражение которыми произошло в условиях лечебного учреждения.
                                Они представляют собой большую медико-социальную проблему, поскольку утяжеляют течение основного заболевания, увеличивают длительность лечения в 1,5 раза, а количество летальных исходов - в 5 раз.
                                Распространенность внутрибольничных инфекций в медицинских учреждениях различного профиля составляет 5-12%.</p>
                            <p className="mt-4">Использование одноразовых стерильных инструментов и расходных материалов существенно повышает безопасность пациента и врача, упрощает и ускоряет процесс предварительной подготовки к процедуре.</p>
                        </div>
                    </div>
                </Block>
            </div>


            <Block>
                <div className="mx-5 my-8">
                    <div className="mb-5">
                        <h1 className="text-3xl mb-2"><span className="text-primary_green">Кому</span> доверить свою кровь?</h1>
                        <p>На что обратить внимание при выборе лаборатории - ДО того, как прийти в лабораторию?</p>
                    </div>
                    {arrTruster.map((el, index) => {
                        return (
                            <div key={el.title} className="rounded-xl max-w-[800px] overflow-hidden mx-auto ">
                                <Accordion title={el.title} design=" bg-body-bg">
                                    <p>{el.bodyf}</p>
                                    {el.bodys != '' && <p className="pt-4">{el.bodys}</p>}
                                    {el.bodyt != '' && <p className="pt-4">{el.bodyt}</p>}
                                </Accordion>
                                {index != arrTruster.length - 1 && <hr className="w-full bg-white h-1 max-w-[800px] mx-auto transition-transform duration-500 " />}
                            </div>
                        )
                    })}

                </div>
            </Block>
            <NavPartners />
        </>
    )
}