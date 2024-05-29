import { Suspense } from 'react'

const SimpleVideo = () => {
    return (
        <>
            <Suspense fallback={
                <>
                    <div className="absolute  w-full h-full bg-txtGreen/50"></div>
                    <h1 className="z-10 absolute bottom-[300px] text-center text-white font-semibold text-6xl">
                        Производство OneStep
                    </h1>
                    <h2 className="z-10 absolute bottom-[200px] text-center text-white font-semibold text-3xl">
                        Современные технологии и мировые стандарты качества
                    </h2>
                </>
            }>
                <video autoPlay muted loop className='w-full h-full object-cover'>
                    <source src="/videos/onestepvideo.webm" type="video/webm" />
                </video>

            </Suspense>
        </>
    )
}

export { SimpleVideo }