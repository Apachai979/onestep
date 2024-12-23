
export default function devSops() {
    return (
        <>
            <div className='container mx-auto my-8 max-w-[1200px] space-y-3 px-10'>
                <h1 className='text-center text-2xl font-semibold'>
                    Разработка СОПов: правила, рекомендации, нормативная база.
                </h1>
                <h2 className='font-semibold'>Каковы основные требования к СОПам?</h2>
                <p>
                    При разработке алгоритмов должны учитываться действующие стандарты, включающие
                    ГОСТы, клинические рекомендации, санитарно-эпидемиологические правила.
                </p>
                <p>
                    Рекомендуется оставлять краткие, четкие и конкретные СОПы. Действия по процедуре
                    нужно описывать без теоретических обоснований и объяснений, чтобы исполнитель не
                    тратил время на теорию, а оперативно и правильно выполнял задачи стандарта.
                </p>
                <p>
                    Необходимо учитывать специфику своей медорганизации в СОПах — только тогда они
                    повысят эффективность и безопасность работы персонала.
                </p>

                <h2 className='font-semibold'>Какие документы использовать при составлении СОПа</h2>
                <p>
                    Все положения СОПа должны быть согласованы с действующими требованиями
                    нормативных документов. Необходимо изучить действующие нормативные документы,
                    локальные акты по теме стандарта.
                </p>
                <p>
                    Можно взять готовые образцы СОПа. Так, в нашем разделе «СОПы медицинских
                    процедур с применением наборов NeoSet», мы приводим готовые образцы СОПов по
                    некоторым видам медицинских процедур. В них вы встретите действующие нормативные
                    документы, актуальные на дату размещения СОПа.
                </p>
                <div className='flex justify-end'>
                    <div>
                        <p className='text-right'>(Внимание!</p>
                        <p className='w-96 text-right'>
                            При использовании готовых стандартов и шаблонов, рекомендуем
                            адаптировать их к специфике вашего ЛПУ)
                        </p>
                    </div>
                </div>
                <p>
                    Чтобы лучше понимать цели и структуру стандарта, правильно применять термины в
                    документе, хорошо ознакомиться с ГОСТами:
                </p>
                <ul className=''>
                    <li>
                        &#8212; <span className='text-mainGreen'>ГОСТ Р ИСО/ТО 10 013­2007</span>{" "}
                        «Менеджмент организации. Руководство
                    </li>
                    <li>
                        &#8212; <span className='text-mainGreen'>ГОСТ Р ИСО 9000­2015</span>{" "}
                        «Системы менеджмента качества. Основные положения и словарь».
                    </li>
                </ul>
                <p>
                    Также в основе СОПов должны содержаться инструкции по применению и эксплуатации
                    к медицинским средствам, изделиям, технике. Так, например, при разработке СОПов
                    по взятию венозной крови при помощи системы Vacuette — инструкции по применению
                    данной системы и т. д.
                </p>
            </div>
        </>
    )
}
