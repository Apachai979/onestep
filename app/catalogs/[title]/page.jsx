import ButtonOpenForm from "@/components/buttons/ButtonOpenForm";
import Image from "next/image";
import Link from "next/link";
import prisma from "@/lib/client";
import { Napkin, PlasterPostOperative, ScalpelEleven, NeedleHolder, PlasterFixCatheter, PlasterTrip, Clamp, Plaster, PintsetThin, Bandage, Cover, CoverAperture, PintsetMedium, ScalpelRemoveFiber, CoverAdhesive, Ball, Container, AppPieces } from "@/components/pieces/MedicalPieces";


// const delay = (milliseconds) => {
//     return new Promise(resolve => setTimeout(resolve, milliseconds));
// };
// export const dynamicParams = false
// export async function generateStaticParams() {
//     const neosets = await prisma.neoset.findMany()

//     return neosets.map((neo) => ({
//         slug: neo.title,
//     }));
// }

export async function generateMetadata({ params: { title } }) {

    const data = await prisma.neoset.findFirst({
        where: {
            pathname: title
        }
    })

    return {
        title: data.name,
    }
}

const components = {
    clamp: <Clamp />,
    napkin: <Napkin />,
    ball: <Ball />,
    pintsetMedium: <PintsetMedium />,
    pintsetThin: <PintsetThin />,
    scalpelRemoveFiber: <ScalpelRemoveFiber />,
    scalpelEleven: <ScalpelEleven />,
    clamp: <Clamp />,
    needleHolder: <NeedleHolder />,
    container: <Container />,
    bandage: <Bandage />,
    plasterTrip: <PlasterTrip />,
    plaster: <Plaster />,
    plasterPostOperative: <PlasterPostOperative />,
    plasterFixCatheter: <PlasterFixCatheter />,
    cover: <Cover />,
    coverAperture: <CoverAperture />,
    coverAdhesive: <CoverAdhesive />,
};

async function getNeoset(titleName) {
    // const response = await fetch('http://localhost:3000/api/neosets/' + titleName)
    // if (!response.ok) throw new Error("Unable to fetch Neosets.")
    // return response.json()

    // await delay(10000)

    try {
        const data = await prisma.neoset.findFirst({
            where: {
                pathname: titleName
            },
            include: {
                code: {
                    include: {
                        consistOf: true
                    }
                }
            }

        })

        const newArr = [...data.code[0].consistOf];

        for (let i = 1; i < data.code.length; i++) {
            newArr.forEach(comp => {
                let index = newArr.findIndex(c => c.component === comp.component);
                if (index !== -1) {
                    newArr[index] = {
                        ...newArr[index],
                        ['count' + (i + 1)]: comp.count
                    };
                }
            });
        }

        return [data, newArr]

    } catch (e) {
        console.log(e)
    }
}


export default async function Neoset({ params: { title } }) {

    // await new Promise(resolve => setTimeout(resolve, 5000))

    const [neoset, arrConsistOf] = await getNeoset(title)

    function DializImage(neosetCode, sliceSize) {
        return Object.values(neosetCode
            .slice(0, sliceSize)
            .flatMap(obj => obj.consistOf)
            .reduce((mergedComponents, item) => {
                if (!mergedComponents[item.component]) {
                    mergedComponents[item.component] = item;
                }
                return mergedComponents;
            }, []));
    }

    const Dializ = () => {

        const consistOfValuesArrayStart = neoset.code
            .filter(item => item.title === 'Начало')
            .flatMap(item => item.consistOf);

        const consistOfValuesArrayEnd = neoset.code
            .filter(item => item.title === 'Завершение')
            .flatMap(item => item.consistOf);

        const processConsistOfValues = (arr) => {
            return arr.reduce((acc, current) => {
                const existingItem = acc.find(obj => obj.component === current.component);
                if (existingItem) {
                    existingItem[`count${existingItem.countt}`] = current.count;
                    existingItem.countt++;
                } else {
                    acc.push({ ...current, countt: 2 });
                }
                return acc;
            }, []);
        };

        const arrStart = processConsistOfValues(consistOfValuesArrayStart);
        const arrEnd = processConsistOfValues(consistOfValuesArrayEnd);

        function renderRows(data) {
            return data.map((el) => (
                <tr key={el.id} className="bg-gray-50 odd:bg-white even:bg-slate-100 border-b border-stone-200">
                    <td className="py-2 px-4">{el.component}</td>
                    <td className="py-2 px-4 text-center">{el.count}</td>
                    <td className="py-2 px-4 text-center">{el.count2}</td>
                    <td className="py-2 px-4 text-center">{el.count3}</td>
                </tr>
            ));
        }

        function renderEmptyCells(length) {
            return Array.from({ length }, (_, index) => (
                <td key={index} className="p-1"></td>
            ));
        }

        return (
            <>
                <tr className="border-y border-gray-600 bg-white">
                    <td className="py-2 px-4 font-semibold indent-5">Начало процедуры</td>
                    <td className="className=p-3"></td>
                    <td className="className=p-3"></td>
                    <td className="className=p-3"></td>
                </tr>
                {renderRows(arrStart)}
                <tr className="bg-bodyColor">
                    {renderEmptyCells(neoset.code.length - 2)}
                </tr>
                <tr className="border-b border-gray-600 bg-white">
                    <td className="py-2 px-4 font-semibold indent-5">Завершение процедуры</td>
                    <td className="className=p-3"></td>
                    <td className="className=p-3"></td>
                    <td className="className=p-3"></td>
                </tr>
                {renderRows(arrEnd)}
            </>
        )
    }

    return (
        <>
            <div className="container mx-auto px-4 max-w-[1200px] my-10">
                <div className="flex flex-col space-y-5 items-center lg:flex-row-reverse lg:space-y-0 lg:items-start">
                    <div className="flex">
                        <Image
                            src="/manufacture/nabor1.png"
                            alt="Neoset"
                            width={1000}
                            height={2000}
                            className='object-cover object-center shadow-md rounded-md w-[500px] h-[450px] mt-2'>
                        </Image >
                    </div>
                    <div className="flex flex-col flex-1">
                        <Link href="/"><h1 className="text-5xl text-txtGreen font-semibold">{neoset.name}</h1></Link>
                        <p className="text-txtGreen text-2xl mt-5">{neoset.description}</p>
                        <p className="text-txtGreen font-semibold text-xl mt-5">Скачать:</p>
                        <p><Link href="/" className="inline text-mainGreen text-lg font-semibold hover:text-night_green ">Регистрационное удостоверение</Link></p>
                        <p><Link href="/" className="inline-flex text-mainGreen text-lg font-semibold hover:text-night_green">Инструкция по применению </Link></p>
                        <p><Link href="/" className="text-mainGreen text-lg font-semibold hover:text-night_green">Видео-инструкция</Link></p>
                        <div className="mt-10">
                            <ButtonOpenForm url="/">Получить консультацию</ButtonOpenForm>
                        </div>
                    </div>

                </div>
            </div>

            <div className="container mx-auto px-4 max-w-[1200px]">
                <div className=" rounded-xl overflow-auto bg-white">
                    <table className="w-full table-auto">
                        <thead>
                            <tr className="border-b border-slate-600 ">
                                <th className="text-left py-2 px-4 ">Состав:</th>
                                {neoset.code.map((el) => {
                                    if (el.title !== "Завершение") return <th key={el.id} className="py-2 px-4 ">{el.transcript}</th>
                                })}
                            </tr>
                        </thead>
                        <tbody>
                            {title === 'dlya-gemodializa' ? <Dializ />
                                : arrConsistOf.map((el) => {
                                    return (
                                        <tr key={el.id} className="bg-gray-50 odd:bg-white even:bg-slate-100 border-b border-stone-200">
                                            <td className="py-2 px-4">{el.component}</td>
                                            <td className="py-2 px-4 text-center">{el.count}</td>
                                            <td className="py-2 px-4 text-center">{el.count2}</td>
                                            {(typeof el.count3 !== "undefined") && <td className="py-2 px-4 text-center">{el.count3}</td>}
                                            {(typeof el.count4 !== "undefined") && <td className="py-2 px-4 text-center">{el.count4}</td>}
                                        </tr>
                                    )
                                })

                            }

                            <tr className="bg-bodyColor" >
                                {title === 'dlya-gemodializa'
                                    ? Array.from({ length: (neoset.code.length - 2) }, (_, index) => (
                                        <td key={index} className="p-3"></td>
                                    ))
                                    : Array.from({ length: neoset.code.length + 1 }, (_, index) => (
                                        <td key={index} className="p-3"></td>
                                    ))
                                }
                            </tr>

                            <tr className="border-t border-slate-400" >
                                <td className="py-2 px-4">Количество наборов в транспортной упаковке:</td>
                                <td className="py-2 px-4 text-center">60</td>
                                <td className="py-2 px-4 text-center">50</td>
                                {/* <td className="py-2 px-4 text-center">50</td> */}
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div >

            <AppPieces>
                {title === 'dlya-gemodializa'
                    ? DializImage(neoset.code, 2).map((el) => components[el.class])
                    : arrConsistOf.map((el) => components[el.class])}
            </AppPieces>
        </>
    )
}