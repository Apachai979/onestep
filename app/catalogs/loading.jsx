export default function LoadingNeosets() {
    return (
        <>
            <div className="container mx-auto px-4 max-w-[1200px] min-h-screen">
                <div className="flex justify-between items-end space-x-10">
                    <h1 className="text-txtGreen text-4xl font-semibold text-left pt-10">Каталог нашей продукции</h1>
                    <div className="animate-pulse w-[200px] h-6 bg-gray-400 rounded-full"></div>
                </div>
                <h2 className="text-txtGreen text-2xl font-semibold text-left my-10">Наборы медицинские процедурные NeoSet</h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-y-5 xl:grid-cols-4 justify-items-center">
                    {Array.from({ length: 8 }, (_, index) => (
                        <div key={index} className="flex flex-col items-center justify-center  space-y-1">
                            <div className="animate-pulse w-[265px] h-[170px] bg-gray-300 rounded-2xl mb-4"></div>
                            <div className="animate-pulse w-[245px] h-6 bg-gray-400 rounded-full self-start ms-1"></div>
                            <div className="animate-pulse w-[220px] h-6 bg-gray-300 rounded-full self-start ms-1"></div>
                        </div>
                    ))}


                </div>

                <hr className='mt-10' />
                <h2 className="text-txtGreen text-2xl font-semibold text-left my-10">Одноразовые стерильные перевязочные материалы</h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-y-5 xl:grid-cols-4 justify-items-center">
                    {Array.from({ length: 3 }, (_, index) => (
                        <div key={index} className="flex flex-col items-center justify-center  space-y-1">
                            <div className="animate-pulse w-[265px] h-[170px] bg-gray-300 rounded-2xl mb-4"></div>
                            <div className="animate-pulse w-[245px] h-6 bg-gray-400 rounded-full self-start ms-1"></div>
                            <div className="animate-pulse w-[220px] h-6 bg-gray-300 rounded-full self-start ms-1"></div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="container mx-auto px-4 max-w-[1200px]">
                <div className='flex flex-col md:flex-row justify-center items-center py-10 px-14 my-10  bg-gray-200 rounded-3xl md:space-x-20'>
                    <h2 className='text-2xl text-txtGreen text-center md:text-left'>Мы с удовольствием ответим на любой ваш вопрос по продукции, услугам и решениям OneStep. Для этого, пожалуйста, заполните форму ниже или позвоните нам.
                    </h2>

                </div>
            </div>
        </>

    )
}