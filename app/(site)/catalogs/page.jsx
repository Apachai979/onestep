import Link from "next/link"
import Neosets from "@/components/Neosets"
import TellaSoft from "@/components/TellaSoft"

export const metadata = {
    title: "Каталог",
    description:
        "Российский производитель медицинских одноразовых перевязочных материалов и процедурных стерильных наборов",
}

export default function Catalogs() {
    return (
        <>
            <div className='container mx-auto min-h-screen max-w-[1200px] px-4'>
                <div className='flex flex-col items-start gap-2 pt-10 sm:flex-row sm:items-end sm:justify-between sm:gap-10'>
                    <h1 className='text-left text-3xl font-semibold text-txtGreen sm:text-4xl'>
                        Каталог нашей продукции
                    </h1>
                    <Link
                        href='/files/Catalog_ONESTEP.pdf'
                        className='shrink-0 text-primary_green hover:text-dark_green sm:text-nowrap'
                    >
                        Скачать каталог в PDF
                    </Link>
                </div>
                <h2 className='my-10 text-left text-2xl font-semibold text-txtGreen'>
                    Наборы медицинские процедурные NeoSet
                </h2>
                <div className='grid justify-items-center gap-y-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
                    <Neosets />
                </div>

                <hr className='mt-10 h-px border-0 bg-brand_soft/60' />
                <h2 className='my-10 text-left text-2xl font-semibold text-txtGreen'>
                    Одноразовые стерильные перевязочные материалы
                </h2>
                <div className='grid justify-items-center gap-y-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
                    <TellaSoft />
                </div>
            </div>
            <div className='container mx-auto max-w-[1200px] px-4'>
                <div className='my-10 flex flex-col items-center justify-center rounded-3xl bg-gray-200 px-14 py-10 md:flex-row md:space-x-20'>
                    <h2 className='text-center text-2xl text-txtGreen md:text-left'>
                        Мы с удовольствием ответим на любой ваш вопрос по продукции, услугам и
                        решениям OneStep. Для этого, пожалуйста, заполните форму ниже или позвоните
                        нам.
                    </h2>
                    <Link
                        href='/'
                        className='rounded-full bg-mainGreen px-10 py-3 text-xl text-white shadow-md shadow-txtGreen/50 transition-all hover:bg-contrastColor hover:shadow-inner hover:shadow-gray-600/50'
                    >
                        Связаться
                    </Link>
                </div>
            </div>
        </>
    )
}
