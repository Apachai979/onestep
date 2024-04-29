import Link from "next/link"
import Neosets from "@/components/Neosets"
import TellaSoft from "@/components/TellaSoft"

export const metadata = {
    title: 'Каталог',
    description: 'Российский производитель медицинских одноразовых перевязочных материалов и процедурных стерильных наборов',
}

export default function Catalogs() {

    return (
        <>
            <div className="container mx-auto px-4 max-w-[1200px] min-h-screen">
                <div className="flex justify-between items-end space-x-10">
                    <h1 className="text-txtGreen text-4xl font-semibold text-left pt-10">Каталог нашей продукции</h1>
                    <Link href='/files/catalog_30_08_24.pdf' className="sm:text-nowrap text-primary_green hover:text-dark_green">Скачать каталог в PDF</Link>
                </div>
                <h2 className="text-txtGreen text-2xl font-semibold text-left my-10">Наборы медицинские процедурные NeoSet</h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-y-5 xl:grid-cols-4 justify-items-center">
                    <Neosets />
                </div>

                <hr className='mt-10' />
                <h2 className="text-txtGreen text-2xl font-semibold text-left my-10">Одноразовые стерильные перевязочные материалы</h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-y-5 xl:grid-cols-4 justify-items-center">
                    <TellaSoft />
                </div>
            </div>
            <div className="container mx-auto px-4 max-w-[1200px]">
                <div className='flex flex-col md:flex-row justify-center items-center py-10 px-14 my-10  bg-gray-200 rounded-3xl md:space-x-20'>
                    <h2 className='text-2xl text-txtGreen text-center md:text-left'>Мы с удовольствием ответим на любой ваш вопрос по продукции, услугам и решениям OneStep. Для этого, пожалуйста, заполните форму ниже или позвоните нам.
                    </h2>
                    <Link href="/" className='px-10 py-3 bg-mainGreen shadow-md shadow-txtGreen/50 hover:shadow-inner hover:shadow-gray-600/50 transition-all hover:bg-contrastColor text-white text-xl rounded-full'>Связаться</Link>
                </div>
            </div>
        </>
    )
}