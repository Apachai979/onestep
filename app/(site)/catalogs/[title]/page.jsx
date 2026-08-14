import parsedData from "@/components/Data/data.json"
import ButtonOpenForm from "@/components/buttons/ButtonOpenForm"
import ButtonExtra from "@/components/buttons/ButtonExtra"
import ImageCarousel from "@/components/ImageCarousel"
import Link from "next/link"
import Block from "@/components/Block"
import Image from "next/image"
import { notFound } from "next/navigation"

// Прочерк в таблице состава — как он записан в data.json.
const NO_AMOUNT = "-"

// Документы к товару. У гемодиализа — свой комплект из /files/hemodialysis/
// (РУ, инструкция и два СОПа), у остальных — общие РУ и инструкция.
const HEMODIALYSIS_DOCUMENTS = [
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

const COMMON_DOCUMENTS = [
    {
        href: "/files/registration_certificate.pdf",
        label: "Регистрационное удостоверение №РЗН 2024/23821 от 16.10.2024",
    },
    {
        href: "/files/instruction.pdf",
        label: "Инструкция по применению",
    },
]

// Строки таблицы состава: имя компонента + количества по колонкам-артикулам.
// Количество ищется в композиции по названию, а не берётся по порядку внутри неё,
// поэтому артикул без какой-то строки получает прочерк и не сдвигает соседние значения.
function buildCompositionRows(compositions) {
    const names = []
    compositions.forEach(composition => {
        composition.components.forEach(component => {
            if (!names.includes(component.components_name_ru)) {
                names.push(component.components_name_ru)
            }
        })
    })

    return names.map(name => ({
        name,
        amounts: compositions.map(
            composition =>
                composition.components.find(component => component.components_name_ru === name)
                    ?.amount ?? NO_AMOUNT,
        ),
    }))
}

export async function generateStaticParams() {
    return parsedData.map(set => ({
        title: set.href,
    }))
}

export async function generateMetadata({ params }) {
    const neoset = parsedData.find(neo => neo.href === params.title)

    if (!neoset) notFound()

    return {
        title: neoset.runame,
    }
}

export default function Neoset({ params }) {
    const neoset = parsedData.find(neo => neo.href === params.title)

    if (!neoset) notFound()

    // Набор с двумя этапами процедуры (сейчас это гемодиализ) отличается наличием
    // in_the_end — таблица тогда делится на «Начало» и «Завершение процедуры».
    const hasEndStage = Boolean(neoset.in_the_end)

    const beginningRows = buildCompositionRows(neoset.in_the_beginning.compositions)
    const endRows = hasEndStage ? buildCompositionRows(neoset.in_the_end.compositions) : []

    const documents = hasEndStage ? HEMODIALYSIS_DOCUMENTS : COMMON_DOCUMENTS

    const columnsCount = neoset.in_the_beginning.compositions.length + 1

    const renderComponentRows = rows =>
        rows.map(row => (
            <tr key={row.name} className='border-b border-stone-200 odd:bg-white even:bg-slate-100'>
                <td className='px-4 py-2'>{row.name}</td>
                {row.amounts.map((amount, idx) => (
                    <td key={idx} className='px-4 py-2 text-center'>
                        {amount}
                    </td>
                ))}
            </tr>
        ))

    return (
        <>
            <div className='container mx-auto mb-10 mt-10 max-w-[1200px] px-4'>
                <div className='flex flex-col items-center space-y-5 lg:flex-row-reverse lg:items-start lg:space-y-0'>
                    <div className='mx-auto flex pt-2'>
                        <ImageCarousel slides={neoset.photo_lib} w='550' h='350' />
                    </div>
                    <div className='flex flex-1 flex-col'>
                        <h1 className='text-3xl font-semibold text-txtGreen sm:text-4xl lg:text-5xl'>
                            {neoset.runame}
                        </h1>
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
                                <ButtonExtra textButton='Получить консультацию' />
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
                                <th scope='col' className='px-4 py-2 text-left'>
                                    Состав:
                                </th>
                                {neoset.in_the_beginning.compositions.map(el => (
                                    <th key={el.tagname} scope='col' className='px-4 py-2'>
                                        {el.tagname}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {hasEndStage && (
                                <tr className='border-y-2 border-slate-700 border-b-slate-400'>
                                    <td colSpan={columnsCount} className='px-4 py-2 font-semibold'>
                                        Начало процедуры
                                    </td>
                                </tr>
                            )}

                            {renderComponentRows(beginningRows)}

                            {hasEndStage && (
                                <>
                                    <tr className='border-y-2 border-slate-700 border-b-slate-400'>
                                        <td
                                            colSpan={columnsCount}
                                            className='px-4 py-2 font-semibold'
                                        >
                                            Завершение процедуры
                                        </td>
                                    </tr>
                                    {renderComponentRows(endRows)}
                                </>
                            )}
                            <tr className='border-t-2 border-slate-700'>
                                <td colSpan={columnsCount} className='px-4 py-2 font-semibold'>
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
