import ButtonOpenForm from "@/components/buttons/ButtonOpenForm"
import Image from "next/image"
import Link from "next/link"
import prisma from "@/lib/client"
import {
    Napkin,
    PlasterPostOperative,
    ScalpelEleven,
    NeedleHolder,
    PlasterFixCatheter,
    PlasterTrip,
    Clamp,
    Plaster,
    PintsetThin,
    Bandage,
    Cover,
    CoverAperture,
    PintsetMedium,
    ScalpelRemoveFiber,
    CoverAdhesive,
    Ball,
    Container,
    AppPieces,
} from "@/components/pieces/MedicalPieces"
import ImageCarousel from "@/components/ImageCarousel"
import getImages from "@/lib/getImages"
import mySort from "@/lib/mySort"
import ButtonExtra from "@/components/buttons/ButtonExtra"
import ButtonBorder from "@/components/buttons/ButtonBorder"

// const delay = (milliseconds) => {
//     return new Promise(resolve => setTimeout(resolve, milliseconds));
// };
// export const dynamicParams = false
export async function generateStaticParams() {
    const neosets = await prisma.neoset.findMany()

    return neosets.map(neo => ({
        slug: neo.title,
    }))
}

export async function generateMetadata({ params: { title } }) {
    const data = await prisma.neoset.findFirst({
        where: {
            pathname: title,
        },
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
}

async function getNeoset(titleName) {
    // const response = await fetch('http://localhost:3000/api/neosets/' + titleName)
    // if (!response.ok) throw new Error("Unable to fetch Neosets.")
    // return response.json()

    // await delay(10000)

    try {
        const data = await prisma.neoset.findFirst({
            where: {
                pathname: titleName,
            },
            include: {
                code: {
                    include: {
                        consistOf: true,
                    },
                },
            },
        })

        let combinedArray = []

        // Loop through each data.code[i].consistOf array and add its elements to the combined array
        data.code.forEach(codeItem => {
            combinedArray = combinedArray.concat(codeItem.consistOf)
        })
        let groupedByComponent = combinedArray.reduce((acc, item) => {
            let key = item.component
            if (!acc[key]) {
                acc[key] = { ...item, counts: [] }
                delete acc[key].count
            }
            acc[key].counts.push(item.count)
            return acc
        }, {})

        // Convert back to desired format
        let resultArray = Object.values(groupedByComponent).map(item => {
            let counts = item.counts
            let countObject = {}
            counts.forEach((count, idx) => {
                countObject[`count${idx + 1}`] = count
            })
            return { ...item, ...countObject }
        })
        // for (let i = 1; i < data.code.length; i++) {
        //     newArr.forEach(comp => {
        //         let index = data.code[i].consistOf.findIndex(c => c.component === comp.component)
        //         if (index !== -1) {
        //             newArr[index] = {
        //                 ...newArr[index],
        //                 ["count" + (i + 1)]: comp.count,
        //             }
        //         }
        //     })
        // }

        return [data, resultArray]
    } catch (e) {
        console.log(e)
    }
}
async function getImagesNeoset(id) {
    const data = await prisma.images.findMany({
        where: {
            neosetId: id,
        },
    })

    return data
}

// async function createImages(title, id) {
//     const path = process.cwd() + "\\public\\catalog\\" + title
//     const imagesNeoset = await getImages(path)
//     const basePathToRemove = "C:/Users/vitalii/Documents/NextProjects/newOnestep/onestep/public"

//     const newImagesNeoset = imagesNeoset.map(file => file.replace(basePathToRemove, ""))

//     const structuredArray = newImagesNeoset.map((src, index) => ({
//         alt: "Комплектующие набора Neoset",
//         description: `neoset`,
//         src: src,
//         neosetId: id,
//     }))

//     console.log(structuredArray)
//     const myImage = await prisma.images.createMany({
//         data: structuredArray,
//     })
// }
const prioritySrc = ["1main.jpeg", "1main.jpg", "2set.jpg"]

export default async function Neoset({ params: { title } }) {
    // await new Promise(resolve => setTimeout(resolve, 5000))

    const [neoset, arrConsistOf] = await getNeoset(title)
    console.log(arrConsistOf)
    const images = await getImagesNeoset(neoset.id)
    const sortImages = await mySort(images, prioritySrc)
    // console.log(sortImages)
    // console.log(images)
    // const tmp = await createImages(title, neoset.id)
    // console.log(tmp)

    function DializImage(neosetCode, sliceSize) {
        return Object.values(
            neosetCode
                .slice(0, sliceSize)
                .flatMap(obj => obj.consistOf)
                .reduce((mergedComponents, item) => {
                    if (!mergedComponents[item.component]) {
                        mergedComponents[item.component] = item
                    }
                    return mergedComponents
                }, [])
        )
    }

    const Dializ = () => {
        const consistOfValuesArrayStart = neoset.code
            .filter(item => item.title === "Начало")
            .flatMap(item => item.consistOf)

        const consistOfValuesArrayEnd = neoset.code
            .filter(item => item.title === "Завершение")
            .flatMap(item => item.consistOf)

        const processConsistOfValues = arr => {
            return arr.reduce((acc, current) => {
                const existingItem = acc.find(obj => obj.component === current.component)
                if (existingItem) {
                    existingItem[`count${existingItem.countt}`] = current.count
                    existingItem.countt++
                } else {
                    acc.push({ ...current, countt: 2 })
                }
                return acc
            }, [])
        }

        const arrStart = processConsistOfValues(consistOfValuesArrayStart)
        const arrEnd = processConsistOfValues(consistOfValuesArrayEnd)

        function renderRows(data) {
            return data.map(el => (
                <tr
                    key={el.id}
                    className='border-b border-stone-200 bg-gray-50 odd:bg-white even:bg-slate-100'
                >
                    <td className='px-4 py-2'>{el.component}</td>
                    <td className='px-4 py-2 text-center'>{el.count}</td>
                    <td className='px-4 py-2 text-center'>{el.count2}</td>
                    <td className='px-4 py-2 text-center'>{el.count3}</td>
                </tr>
            ))
        }

        function renderEmptyCells(length) {
            return Array.from({ length }, (_, index) => <td key={index} className='p-1'></td>)
        }

        return (
            <>
                <tr className='border-y border-gray-600 bg-white'>
                    <td className='px-4 py-2 indent-5 font-semibold'>Начало процедуры</td>
                    <td className='className=p-3'></td>
                    <td className='className=p-3'></td>
                    <td className='className=p-3'></td>
                </tr>
                {renderRows(arrStart)}
                <tr className='bg-bodyColor'>{renderEmptyCells(neoset.code.length - 2)}</tr>
                <tr className='border-b border-gray-600 bg-white'>
                    <td className='px-4 py-2 indent-5 font-semibold'>Завершение процедуры</td>
                    <td className='className=p-3'></td>
                    <td className='className=p-3'></td>
                    <td className='className=p-3'></td>
                </tr>
                {renderRows(arrEnd)}
            </>
        )
    }

    return (
        <>
            <div className='container mx-auto mb-5 mt-10 max-w-[1200px] px-4'>
                <div className='flex flex-col items-center space-y-5 lg:flex-row-reverse lg:items-start lg:space-y-0'>
                    <div className='mx-auto flex pt-2'>
                        <ImageCarousel slides={sortImages} w='550' h='400' />
                    </div>
                    <div className='flex flex-1 flex-col'>
                        <Link href='/'>
                            <h1 className='text-5xl font-semibold text-txtGreen'>{neoset.name}</h1>
                        </Link>
                        <p className='mt-5 text-2xl text-txtGreen'>{neoset.description}</p>
                        <p className='mt-5 text-xl font-semibold text-txtGreen'>Скачать:</p>
                        <p>
                            <Link
                                href='/'
                                className='inline text-lg font-semibold text-mainGreen hover:text-night_green'
                            >
                                Регистрационное удостоверение
                            </Link>
                        </p>
                        <p>
                            <Link
                                href='/'
                                className='inline-flex text-lg font-semibold text-mainGreen hover:text-night_green'
                            >
                                Инструкция по применению{" "}
                            </Link>
                        </p>
                        <p>
                            <Link
                                href='/'
                                className='text-lg font-semibold text-mainGreen hover:text-night_green'
                            >
                                Видео-инструкция
                            </Link>
                        </p>
                        <div className='mt-10'>
                            <ButtonOpenForm url='/'>
                                <ButtonExtra textButton={"Получить консультацию"}></ButtonExtra>
                            </ButtonOpenForm>
                        </div>
                    </div>
                </div>
            </div>

            <div className='container mx-auto max-w-[1200px] px-4'>
                <div className='overflow-auto rounded-xl bg-white'>
                    <table className='w-full table-auto'>
                        <thead>
                            <tr className='border-b border-slate-600'>
                                <th className='px-4 py-2 text-left'>Состав:</th>
                                {neoset.code.map(el => {
                                    if (el.title !== "Завершение")
                                        return (
                                            <th key={el.id} className='px-4 py-2'>
                                                {el.transcript}
                                            </th>
                                        )
                                })}
                            </tr>
                        </thead>
                        <tbody>
                            {title === "dlya-gemodializa" ? (
                                <Dializ />
                            ) : (
                                arrConsistOf.map(el => {
                                    return (
                                        <tr
                                            key={el.id}
                                            className='border-b border-stone-200 bg-gray-50 odd:bg-white even:bg-slate-100'
                                        >
                                            <td className='px-4 py-2'>{el.component}</td>
                                            <td className='px-4 py-2 text-center'>{el.count1}</td>
                                            <td className='px-4 py-2 text-center'>{el.count2}</td>
                                            {typeof el.count3 !== "undefined" && (
                                                <td className='px-4 py-2 text-center'>
                                                    {el.count3}
                                                </td>
                                            )}
                                            {typeof el.count4 !== "undefined" && (
                                                <td className='px-4 py-2 text-center'>
                                                    {el.count4}
                                                </td>
                                            )}
                                        </tr>
                                    )
                                })
                            )}

                            <tr className='bg-bodyColor'>
                                {title === "dlya-gemodializa"
                                    ? Array.from({ length: neoset.code.length - 2 }, (_, index) => (
                                          <td key={index} className='p-3'></td>
                                      ))
                                    : Array.from({ length: neoset.code.length + 1 }, (_, index) => (
                                          <td key={index} className='p-3'></td>
                                      ))}
                            </tr>

                            <tr className='border-t border-slate-400'>
                                <td className='px-4 py-2'>
                                    Количество наборов в транспортной упаковке:
                                </td>
                                <td className='px-4 py-2 text-center'>60</td>
                                <td className='px-4 py-2 text-center'>50</td>
                                {/* <td className="py-2 px-4 text-center">50</td> */}
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <AppPieces>
                {title === "dlya-gemodializa"
                    ? DializImage(neoset.code, 2).map(el => components[el.class])
                    : arrConsistOf.map(el => components[el.class])}
            </AppPieces>
        </>
    )
}
