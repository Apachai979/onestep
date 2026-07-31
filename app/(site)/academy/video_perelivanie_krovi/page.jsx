export default function videoPerelivanieKrovi() {
    return (
        <div className='container mx-auto my-4 max-w-[1200px] px-10'>
            <div className='mb-6 flex flex-col items-center justify-center'>
                <h1 className='text-center text-2xl font-semibold'>
                    Видео &quot;Переливание крови&quot;
                </h1>
                <div className='m-2 h-60 w-96 overflow-hidden rounded-xl md:m-4 md:h-[450px] md:w-[650px]'>
                    <iframe
                        className='h-full w-full'
                        src='https://www.youtube.com/embed/88v5KjwfH14'
                        frameborder='0'
                        allowfullscreen
                    />
                </div>
            </div>
        </div>
    )
}
