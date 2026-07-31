import parsedData from "@/components/Data/data.json"
import ButtonOpenForm from "@/components/buttons/ButtonOpenForm"
import ButtonExtra from "@/components/buttons/ButtonExtra"
import ImageCarousel from "@/components/ImageCarousel"
import Link from "next/link"
import Block from "@/components/Block"
import Image from "next/image"

export async function generateStaticParams() {
    return parsedData.map(set => ({
        title: set.href,
    }))
}

export async function generateMetadata({ params }) {
    const neoset = parsedData.find(neo => neo.href === params.title)

    return {
        title: neoset.runame,
    }
}

export default function Neoset({ params }) {
    const neoset = parsedData.find(neo => neo.href === params.title)

    const componentsList = {}
    neoset.in_the_beginning.compositions.forEach(composition => {
        composition.components.forEach(component => {
            if (!componentsList[component.components_name_ru]) {
                componentsList[component.components_name_ru] = []
            }
            componentsList[component.components_name_ru].push(component.amount)
        })
    })

    const componentsDializList = {}
    if (neoset.name == "Nabor NeoSet dlya gemodializa (nachalo/zaversheniye)") {
        neoset.in_the_end.compositions.forEach(composition => {
            composition.components.forEach(component => {
                if (!componentsDializList[component.components_name_ru]) {
                    componentsDializList[component.components_name_ru] = []
                }
                componentsDializList[component.components_name_ru].push(component.amount)
            })
        })
    }

    const isGemodializ = neoset.name === "Nabor NeoSet dlya gemodializa (nachalo/zaversheniye)"

    // Документы к товару. У гемодиализа — свой комплект из /files/hemodialysis/
    // (РУ, инструкция и два СОПа), у остальных — общие РУ и инструкция.
    const documents = isGemodializ
        ? [
              {
                  href: "/files/hemodialysis/RC_hemodialysis.pdf",
                  label: "Регистрационное удостоверение №РЗН 2024/23580 от 10.09.2024",
              },
              {
                  href: "/files/hemodialysis/Instruction_hemodialysis.pdf",
                  label: "Инструкция по применению",
              },
              {
                  href: "/files/hemodialysis/1SOP_hemodialysis_start.docx",
                  label: 'СОП: "Подключение пациента к АИП с использованием АВФ"',
              },
              {
                  href: "/files/hemodialysis/1SOP_hemodialysis_end.docx",
                  label: 'СОП: "Отключение пациента с АВФ от аппарата искусственной почки"',
              },
          ]
        : [
              {
                  href: "/files/registration_certificate.pdf",
                  label: "Регистрационное удостоверение №РЗН 2024/23821 от 16.10.2024",
              },
              {
                  href: "/files/instruction.pdf",
                  label: "Инструкция по применению",
              },
          ]

    const renderComponentRows = components => {
        return Object.keys(components).map((componentName, index) => (
            <tr
                key={index}
                className='border-b border-stone-200 bg-gray-50 odd:bg-white even:bg-slate-100'
            >
                <td className='px-4 py-2'>{componentName}</td>
                {components[componentName].map((amount, idx) => (
                    <td key={idx} className='px-4 py-2 text-center'>
                        {amount}
                    </td>
                ))}
            </tr>
        ))
    }

    return (
        <>
            <div className='container mx-auto mb-10 mt-10 max-w-[1200px] px-4'>
                <div className='flex flex-col items-center space-y-5 lg:flex-row-reverse lg:items-start lg:space-y-0'>
                    <div className='mx-auto flex pt-2'>
                        <ImageCarousel slides={neoset.photo_lib} w='550' h='350' />
                    </div>
                    <div className='flex flex-1 flex-col'>
                        <Link href='/'>
                            <h1 className='text-3xl font-semibold text-txtGreen sm:text-4xl lg:text-5xl'>
                                {neoset.runame}
                            </h1>
                        </Link>
                        <p className='mt-5 text-2xl text-txtGreen'>{neoset.description}</p>
                        <ul className='mt-5 list-disc pl-5 text-txtGreen'>
                            {documents.map(doc => (
                                <li key={doc.href}>
                                    <Link
                                        href={doc.href}
                                        className='inline text-lg font-semibold text-mainGreen hover:text-night_green'
                                    >
                                        {doc.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                        <div className='mt-10'>
                            <ButtonOpenForm url='/'>
                                <ButtonExtra textButton={"Получить консультацию"}></ButtonExtra>
                            </ButtonOpenForm>
                        </div>
                    </div>
                </div>
            </div>

            <div className='container mx-auto max-w-[1200px] px-4'>
                <div className='overflow-x-auto rounded-xl bg-white'>
                    <table className='w-full min-w-max table-auto'>
                        <thead>
                            <tr className='border-b border-slate-600'>
                                <th className='px-4 py-2 text-left'>Состав:</th>
                                {neoset.in_the_beginning.compositions.map(el => {
                                    return (
                                        <th key={el.tagname} className='px-4 py-2'>
                                            {el.tagname}
                                        </th>
                                    )
                                })}
                            </tr>
                        </thead>
                        <tbody>
                            {neoset.name ===
                                "Nabor NeoSet dlya gemodializa (nachalo/zaversheniye)" && (
                                <tr className='border-y-2 border-slate-700 border-b-slate-400'>
                                    <td className='px-4 py-2 font-semibold'>Начало процедуры</td>
                                </tr>
                            )}

                            {renderComponentRows(componentsList)}

                            {neoset.name ===
                                "Nabor NeoSet dlya gemodializa (nachalo/zaversheniye)" && (
                                <>
                                    <tr className='border-y-2 border-slate-700 border-b-slate-400'>
                                        <td className='px-4 py-2 font-semibold'>
                                            Завершение процедуры
                                        </td>
                                    </tr>
                                    {renderComponentRows(componentsDializList)}
                                </>
                            )}
                            <tr className='border-t-2 border-slate-700'>
                                <td className='px-4 py-2 font-semibold'>
                                    Состав набора может быть скорректирован по вашему запросу
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <Block>
                <div className='my-10 grid justify-items-center gap-5 sm:grid-cols-2 sm920:grid-cols-3 lg1100:grid-cols-4'>
                    {neoset.consists_of.map(component => (
                        <div key={component.tagname} className='flex w-[260px] flex-col'>
                            <Image
                                src={component.image}
                                className='h-[158px] w-[260px] rounded-lg border'
                                alt={component.name}
                                width={260}
                                height={158}
                            />
                            <p className='pl-1.5 pt-2 text-base leading-tight'>
                                {component.description}
                            </p>
                        </div>
                    ))}
                </div>
            </Block>
        </>
    )
}
