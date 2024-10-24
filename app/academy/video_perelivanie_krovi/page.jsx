export default function videoPerelivanieKrovi() {
    return (
        <div className='container mx-auto my-4 max-w-[1200px] px-10'>
            <div className='mb-6 flex flex-col items-center justify-center'>
                <h1 className='font-semibold text-2xl text-center'>
                    Видео "Переливание крови"
                </h1>
                <div className=' m-2 md:m-4 w-96 h-60 md:w-[650px] md:h-[450px] rounded-xl overflow-hidden'>
                    <iframe
                        className='w-full h-full'
                        src="https://www.youtube.com/embed/88v5KjwfH14"
                        frameborder="0"
                        allowfullscreen
                    />
                </div>
            </div>
        </div>
    )
}