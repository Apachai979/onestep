import { Suspense } from "react"

const SimpleVideo = () => {
    // const [showOverlay, setShowOverlay] = useState(true);

    // useEffect(() => {
    //     // Устанавливаем таймер на 3 секунды
    //     const timer = setTimeout(() => {
    //         setShowOverlay(false);
    //     }, 3000);

    //     // Очистка таймера, если компонент будет размонтирован до истечения времени
    //     return () => clearTimeout(timer);
    // }, []);

    return (
        <>
            <Suspense
                fallback={
                    <>
                        <div className='absolute h-full w-full bg-txtGreen/50'></div>
                        <h1 className='absolute bottom-[300px] z-10 text-center text-6xl font-semibold text-white'>
                            Производство OneStep
                        </h1>
                        <h2 className='absolute bottom-[200px] z-10 text-center text-3xl font-semibold text-white'>
                            Современные технологии и мировые стандарты качества
                        </h2>
                    </>
                }
            >
                <video autoPlay muted loop className='h-full w-full object-cover object-center'>
                    <source src='/videos/onestepvideo.webm' type='video/webm' />
                </video>
                {/* {showOverlay && (
                    <>
                        <div className="absolute w-full h-full bg-txtGreen/50"></div>
                        <h1 className="z-10 absolute bottom-[300px] text-center text-white font-semibold text-6xl">
                            Производство OneStep
                        </h1>
                        <h2 className="z-10 absolute bottom-[200px] text-center text-white font-semibold text-3xl">
                            Современные технологии и мировые стандарты качества
                        </h2>
                    </>
                )} */}
            </Suspense>
        </>
    )
}

export { SimpleVideo }
