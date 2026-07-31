import Image from "next/image";

export default function protsedura_perelivaniya_krovi() {
    return (
        <div className='container mx-auto my-4 max-w-[1200px] px-6'>
            <div className="flex flex-col justify-center items-center">
                <h1 className='text-3xl mb-1 text-center'>Как проверяют кровь доноров?</h1>
                <ul className="space-y-3 indent-10">
                    <li>Человек, который сдает кровь впервые, должен заполнить анкету, пройти осмотр терапевта, дерматовенеролога, сдать анализы на группу крови, резус фактор, на инфекции: ВИЧ, вирусный гепатит B и C, сифилис, цитомегаловирус. Иногда программа обследования может быть расширена.</li>
                    <li>Если в крови донора будут обнаружены признаки той или иной инфекции, её отбраковывают и в дальнейшем не используют.</li>
                    <li>Совместимость крови донора и реципиента проверяют при помощи специального анализа — перекрестной пробы на совместимость крови.</li>
                </ul>
                <Image
                    src='/academy/image_topics/protsedura_krovi_donorov.jpg'
                    alt='Проверяем кровь доноров с Onestep'
                    width={1920}
                    height={1080}
                    className=' mt-2 md:mt-1 mb-2 md:m-6 h-[150px] w-[300px] xl:h-[400px] xl:w-[500px] md:h-[300px] md:w-[400px] rounded-xl object-cover shadow-lg mx-auto'
                >
                </Image>
            </div>
        </div>
    )
}