import Image from "next/image"
import Block from "../Block"

function AppPieces({ children }) {
    return (
        <div className='my-10'>
            <Block>
                <div className='grid justify-items-center gap-2 sm:grid-cols-2 sm920:grid-cols-3 lg1100:grid-cols-4'>
                    {children.map((elem, index) => {
                        return <div key={index}>{elem}</div>
                    })}
                </div>
            </Block>
        </div>
    )
}

const PintsetThin = () => {
    return (
        <div key='pintsetThin' className='flex w-[260px] flex-col'>
            <Image
                src='/catalog/vector/pintset.svg'
                className='h-[158px] w-[260px] rounded-lg border'
                alt='Пластиковый пинцет'
                width={260}
                height={158}
            />
            <p className='pl-1.5 pt-2 text-base leading-tight'>
                Пластиковый пинцет имеет тонкие кончики, специально приспособленные для точного и
                надежного захвата шовного материала. Выполнен из полипропилена и усилен
                стекловолокном.
            </p>
        </div>
    )
}
const Ball = () => {
    return (
        <div key='ball' className='flex w-[260px] flex-col'>
            <Image
                src='/catalog/vector/gauzeball.svg'
                className='h-[158px] w-[260px] rounded-lg border py-2'
                alt='Пластиковый пинцет'
                width={260}
                height={158}
            />
            <p className='pl-1.5 pt-2 text-base leading-tight'>
                Тампон марлевый изготавливается из высококачественной марли (100% хлопок) плотностью
                20 нитей на квадратный сантиметр, имеющей европейский сертификат ЕС Certificate.
            </p>
        </div>
    )
}

const Bandage = () => {
    return (
        <div key='bandage' className='flex w-[260px] flex-col'>
            <Image
                src='/catalog/vector/bandage.svg'
                className='h-[158px] w-[260px] rounded-lg border py-2'
                alt='Фиксирующий бинт'
                width={260}
                height={158}
            />
            <p className='pl-1.5 pt-2 text-base leading-tight'>
                Высокоэластичный фиксирующий бинт. Изготовлен из гипоаллергенного полиэстера. Имеет
                европейский сертификат качества ЕС Certificate.
            </p>
        </div>
    )
}

const Cover = () => {
    return (
        <div className='flex w-[260px] flex-col'>
            <Image
                src='/catalog/vector/coating.svg'
                className='h-[158px] w-[260px] rounded-lg border py-2'
                alt='Непромокаемое защитное покрытие'
                width={260}
                height={158}
            />
            <p className='pl-1.5 pt-2 text-base leading-tight'>
                Непромокаемое защитное покрытие выполнено из двух слоев: целлюлоза и полиэтилен.
                Идеально подходит в качестве подлоктевого покрытия стола, защищающего от протекания
                различных жидкостей.
            </p>
        </div>
    )
}
const Container = () => {
    return (
        <div key='container' className='flex w-[260px] flex-col'>
            <Image
                src='/catalog/vector/container.svg'
                className='h-[158px] w-[260px] rounded-lg border py-2'
                alt='Пластиковая емкость'
                width={260}
                height={158}
            />
            <p className='pl-1.5 pt-2 text-base leading-tight'>
                Пластиковая емкость имеет шкалу для определения объема наливаемой жидкости. Отлично
                подходит для дезинфицирующего раствора и смачивания марлевых тампонов.
            </p>
        </div>
    )
}

const Napkin = () => {
    return (
        <div className='flex w-[260px] flex-col'>
            <Image
                src='/catalog/vector/gauzepad.svg'
                className='h-[158px] w-[260px] rounded-lg border'
                alt='Марлевая салфетка'
                width={260}
                height={158}
            />
            <p className='pl-1.5 pt-2 text-base leading-tight'>
                Марлевая салфетка имеет подвернутые кромки и изготавливается из высококачественной
                марли (100% хлопок) плотностью 17 нитей на квадратный сантиметр, имеющей европейский
                сертификат качества EC Certificate.
            </p>
        </div>
    )
}

const PlasterTrip = () => {
    return (
        <div className='flex w-[260px] flex-col'>
            <Image
                src='/catalog/vector/adhesivestrip.svg'
                className='h-[158px] w-[260px] rounded-lg border px-2'
                alt='Пластырная полоска'
                width={260}
                height={158}
            />
            <p className='pl-1.5 pt-2 text-base leading-tight'>
                Пластырная полоска выполнена из нетканного материала с применением гипоаллергенного
                клея.
            </p>
        </div>
    )
}

const ScalpelRemoveFiber = () => {
    return (
        <div className='flex w-[260px] flex-col'>
            <Image
                src='/catalog/vector/scalpelRemoveFiber.svg'
                className='h-[158px] w-[260px] rounded-lg border'
                alt='Скальпель'
                width={260}
                height={158}
            />
            <p className='pl-1.5 pt-2 text-base leading-tight'>
                Скальпель для снятия швов с пластиковой ручкой и защитным колпачком. Лезвие
                выполнено из нержавеющей стали и обладает удобной серповидной формой для подцепления
                и разрезания шовного материала. Имеет европейский сертификат качества EC
                Certificate.
            </p>
        </div>
    )
}

const PintsetMedium = () => {
    return (
        <div className='flex w-[260px] flex-col'>
            <Image
                src='/catalog/vector/tweezers.svg'
                className='h-[158px] w-[260px] rounded-lg border px-2'
                alt='Пластиковый пинцет'
                width={260}
                height={158}
            />
            <p className='pl-1.5 pt-2 text-base leading-tight'>
                Пластиковый пинцет имеет рифленые кончики, специально приспособленные для удобного и
                надежного захвата перевязочных материалов.
            </p>
        </div>
    )
}

const CoverAdhesive = () => {
    return (
        <div className='flex w-[260px] flex-col'>
            <Image
                src='/catalog/vector/withaperture.svg'
                className='h-[158px] w-[260px] rounded-lg border py-2'
                alt='Покрытие с апертурой и адгезивным слоем'
                width={720}
                height={480}
            />
            <p className='pl-1.5 pt-2 text-base leading-tight'>
                Непромокаемое покрытие с апертурой и адгезивным слоем выполнено из двух слоев:
                целлюлоза и полиэтилен. Имеет круглый вырез диаметром 80 мм в центральной части и
                адгезивный слой вокруг него для надежной фиксации на теле пациента.
            </p>
        </div>
    )
}

const Plaster = () => {
    return (
        <div className='flex w-[260px] flex-col'>
            <Image
                src='/catalog/vector/plaster.svg'
                className='h-[158px] w-[260px] rounded-lg border px-2'
                alt='Пластырь с абсорбционной подушкой'
                width={720}
                height={480}
            />
            <p className='pl-1.5 pt-2 text-base leading-tight'>
                Пластырная повязка с абсорбционной подушкой из целлюлозы обладает
                кровеостанавливающими свойствами и применяется для закрытия пункционного отверстия
                после проведения процедуры.
            </p>
        </div>
    )
}
const CoverAperture = () => {
    return (
        <div className='flex w-[260px] flex-col'>
            <Image
                src='/catalog/vector/withaperturemain.svg'
                className='h-[158px] w-[260px] rounded-lg border py-2'
                alt='Покрытие с апертурой'
                width={720}
                height={480}
            />
            <p className='pl-1.5 pt-2 text-base leading-tight'>
                Непромокаемое покрытие с апертурой выполнено из двух слоев: целлюлоза и полиэтилен.
                Имеет круглый вырез в центральной части. Идеально подходит для защиты пациента от
                протекания различных жидкостей.
            </p>
        </div>
    )
}

const Clamp = () => {
    return (
        <div className='flex w-[260px] flex-col'>
            <Image
                src='/catalog/vector/clip.svg'
                className='h-[158px] w-[260px] rounded-lg border px-2'
                alt='Пластиковый зажим'
                width={720}
                height={480}
            />
            <p className='pl-1.5 pt-2 text-base leading-tight'>
                Пластиковый зажим имеет рифленые бранши и зубчатый замок для надежной фиксации и
                зажима различных предметов. Выполнен из полипропилена и усилен стекловолокном.
            </p>
        </div>
    )
}

const PlasterFixCatheter = () => {
    return (
        <div className='flex w-[260px] flex-col'>
            <Image
                src='/catalog/vector/plasterfixed.svg'
                className='h-[158px] rounded-lg border object-contain'
                alt='Пластырная повязка'
                width={720}
                height={480}
            />
            <p className='pl-1.5 pt-2 text-base leading-tight'>
                Пластырная повязка для фиксации катетеров и канюль имеет прозрачную смотровую
                вставку из плёнки в центре повязки и дополнительные полоски для фиксации.
            </p>
        </div>
    )
}

const NeedleHolder = () => {
    return (
        <div className='flex w-[260px] flex-col'>
            <Image
                src='/catalog/vector/needleholder.svg'
                className='h-[158px] w-[260px] rounded-lg border'
                alt='Иглодержатель'
                width={720}
                height={480}
            />
            <p className='pl-1.5 pt-2 text-base leading-tight'>
                Иглодержатель выполнен из нержавеющей стали, имеет рифлёные бранши и зубчатый замок
                для прочного удержания иглы во время наложения швов и фиксации нити при проведении
                хирургических вмешательств.
            </p>
        </div>
    )
}

const ScalpelEleven = () => {
    return (
        <div className='flex w-[260px] flex-col'>
            <Image
                src='/catalog/vector/scalpelEleven.svg'
                className='h-[158px] w-[260px] rounded-lg border px-2'
                alt='Скадбпель №11'
                width={720}
                height={480}
            />
            <p className='pl-1.5 pt-2 text-base leading-tight'>
                Скальпель с пластиковой ручкой и защитным кожухом. Лезвие классической формы №11 для
                различных хирургических манипуляций выполнено из нержавеющей стали. Имеет
                европейский сертификат качества ЕС Certificate.
            </p>
        </div>
    )
}

const PlasterPostOperative = () => {
    return (
        <div className='flex w-[260px] flex-col'>
            <Image
                src='/catalog/vector/plasterwith.svg'
                className='h-[158px] w-[260px] rounded-lg border'
                alt='Пластырь'
                width={720}
                height={480}
            />
            <p className='pl-1.5 pt-2 text-base leading-tight'>
                Пластырная повязка послеоперационная с мягкой подушечкой в центре используется для
                комфортного и безопасного закрытия послеоперационных ран.
            </p>
        </div>
    )
}

export {
    Napkin,
    PlasterPostOperative,
    ScalpelEleven,
    NeedleHolder,
    PlasterFixCatheter,
    Clamp,
    Plaster,
    PintsetThin,
    Bandage,
    Cover,
    CoverAperture,
    PlasterTrip,
    PintsetMedium,
    ScalpelRemoveFiber,
    CoverAdhesive,
    Ball,
    Container,
    AppPieces,
}
