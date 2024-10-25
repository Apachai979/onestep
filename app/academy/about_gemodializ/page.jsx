import Image from "next/image"

export default function aboutGemodializ() {
    return (
        <div className='container mx-auto my-4 max-w-[1200px] px-10'>
            <div className='flex flex-col items-center justify-center'>
                <h1 className='text-3xl mb-2'>Кратко - о процедуре ГЕМОДИАЛИЗА</h1>
                <Image
                    src='/academy/image_topics/gemo1.jpeg'
                    alt='Onestep о процедуре ГЕМОДИАЛИЗА'
                    width={1920}
                    height={1080}
                    className='mb-2 md:m-6 h-[150px] w-[300px] xl:h-[400px] xl:w-[500px] md:h-[300px] md:w-[400px] rounded-xl object-cover shadow-lg mx-auto'
                >
                </Image>
                <p>ГЕМОДИАЛИЗ – процедура, заменяющая данный от природы человеку фильтр, который и представляют собой почки.</p>
                <p>Данный метод заместительной почечной терапии проводится с использованием специального диализного аппарата — «искусственной почки».</p>
                <p>При гемодиализе кровь очищается от вредных веществ вне тела пациента при помощи синтетического фильтра — диализатора.</p>
                <h2 className="text-xl my-3">КАК ЭТО РАБОТАЕТ?</h2>
                <div className="space-y-3">
                    <p>Во время процедуры кровь поступает из организма пациента в диализный аппарат по системе трубок, которые называются кровопроводящими магистралями. Затем, после очищения в аппарате, кровь возвращается обратно.</p>
                    <p>Чтобы эта процедура была возможна, пациенту делают операцию для формирования сосудистого доступа. Это может быть артериовенозная фистула или сосудистый катетер. Обычно для этого используются кровеносные сосуды, расположенные на предплечье правой или левой руки.</p>
                </div>
                <Image
                    src='/academy/image_topics/gemo2.jpg'
                    alt='Как это работает? Onestep'
                    width={1920}
                    height={1080}
                    className='mb-2 md:m-6 h-[150px] w-[300px] xl:h-[400px] xl:w-[500px] md:h-[300px] md:w-[400px] rounded-xl object-cover shadow-lg mx-auto'
                >
                </Image>
                <h2 className="text-xl mt-3 mb-1">БЕЗОПАСНОСТЬ.</h2>
                <p>В течение суток на одном диализном аппарате лечение может проводиться двум-трем пациентам в несколько смен.</p>
                <p>Чтобы избежать передачи инфекций от пациента к пациенту, необходимо соблюдать следующие меры безопасности:</p>
                <ol className='list-inside'>
                    <li>&#8212; качественная очистку аппаратов после каждой процедуры;
                    </li>
                    <li>&#8212; использование одноразовых стерильных процедурных наборов для гемодиализа (таких как набор NeoSet).</li>
                </ol>
                <Image
                    src='/academy/image_topics/gemo3.jpeg'
                    alt='Безопасность Onestep'
                    width={1920}
                    height={1080}
                    className='my-2 mb-2 md:m-6 h-[150px] w-[300px] xl:h-[400px] xl:w-[500px] md:h-[300px] md:w-[400px] rounded-xl object-cover shadow-lg mx-auto'
                >
                </Image>
                <div className="space-y-2">
                    <h2 className="text-xl mt-1">ГДЕ ПРОВОДИТСЯ?</h2>
                    <p>Гемодиализ проводится в медицинских центрах квалифицированным персоналом — врачами и медицинскими сестрами отделений гемодиализа.
                    </p>
                    <p>Пациентам необходимо приезжать в лечебное учреждение для проведения гемодиализа 2 или 3 раза в неделю.</p>
                    <p>Обычно процедура длится 4 часа.</p>
                    <p>Как правило, диализные смены чередуются по схеме: понедельник — среда — пятница или вторник — четверг — суббота; воскресенье — выходной день.</p>
                </div>
            </div>
        </div>
    )
}