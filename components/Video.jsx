import { Suspense } from 'react'
export default function Video() {
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
                <iframe
                    src="https://www.youtube.com/watch?v=ERYuLbW2NZE"
                    frameborder="0"
                    allowfullscreen
                    width="100%"
                    height="100%"
                />
            </Suspense>
        </>
    )
}