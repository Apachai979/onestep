import { YouTubeEmbed } from '@next/third-parties/google'

export default function videoViewProcedureRoom() {
    return (
        <div className='container mx-auto my-4 max-w-[1200px] px-10'>
            <div className='mb-6 flex flex-col items-center justify-center'>
                <h1 className='font-semibold text-2xl text-center'>
                    Видео-обзор оснащения процедурного кабинета в московской клинике: разбор и рекомендации.
                </h1>
                <div className=' m-2 md:m-4 w-96 h-60 md:w-[650px] md:h-[450px] rounded-xl overflow-hidden'>
                    <iframe
                        className='w-full h-full'
                        src="https://www.youtube.com/embed/sp8MkUUKdpE"
                        frameborder="0"
                        allowfullscreen
                    />
                </div>
            </div>
        </div>
    )
}