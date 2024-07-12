"use client"
import Image from "next/image"
import { RiArrowLeftWideFill } from "react-icons/ri"
import { RiArrowRightWideFill } from "react-icons/ri"
import { RiCloseLargeLine } from "react-icons/ri"
import { TbSquareRoundedArrowLeft } from "react-icons/tb"
import { TbSquareRoundedArrowRight } from "react-icons/tb"
import { useState } from "react"

const baseSlides = [
    {
        id: 0,
        alt: "",
        src: "/academy/tabs/lab.jpeg",
    },
    {
        id: 1,
        alt: "",
        src: "/academy/tabs/lab2.jpeg",
    },
    {
        id: 2,
        alt: "",
        src: "/academy/tabs/lab3.jpeg",
    },
    {
        id: 3,
        alt: "",
        src: "/academy/tabs/lab4.jpeg",
    },
]

const splitW = w => {
    let a = Math.floor(0.56 * w) // Округление вниз до ближайшего целого
    let b = Math.floor(0.22 * w) // Округление вниз до ближайшего целого
    let c = Math.floor(0.22 * w) // Округление вниз до ближайшего целого

    let total = a + b + c

    // Корректируем значения, чтобы их сумма была равна w
    if (total < w) {
        let difference = w - total
        a += difference // Добавляем разницу к одной из переменных (например, a)
    } else if (total > w) {
        let difference = total - w
        a -= difference // Вычитаем разницу из одной из переменных (например, a)
    }

    return [a, b]
}

export default function ImageCarousel({ slides = baseSlides, w = "400", h = "280" }) {
    const [count, setCount] = useState(0)
    const [animating, setAnimating] = useState(false)
    const [isZoomed, setIsZoomed] = useState(false)

    const handleClick = () => {
        setIsZoomed(!isZoomed)
    }

    const previousSlide = () => {
        if (!animating) {
            setAnimating(true)
            setTimeout(() => {
                setCount((count - 1 + slides.length) % slides.length)
                setAnimating(false)
            }, 150) // Duration of the animation
        }
    }

    const nextSlide = () => {
        if (!animating) {
            setAnimating(true)
            setTimeout(() => {
                setCount((count + 1) % slides.length)
                setAnimating(false)
            }, 150) // Duration of the animation
        }
    }

    const pickSlide = index => {
        if (!animating) {
            setAnimating(true)
            setTimeout(() => {
                setCount(index)
                setAnimating(false)
            }, 150) // Duration of the animation
        }
    }

    return (
        <>
            <div className={`${isZoomed ? "visible" : "invisible"} select-none`}>
                <div className='fixed bottom-0 left-0 right-0 top-0 z-30 mx-auto my-auto bg-gray-500/60 backdrop-blur-md'>
                    <div
                        className='absolute right-12 top-10 z-20 cursor-pointer p-6 text-2xl lg:px-24 lg:py-36'
                        onClick={handleClick}
                    >
                        <RiCloseLargeLine
                            size={35}
                            className='absolute right-3 top-3 lg:right-5 lg:top-5'
                        ></RiCloseLargeLine>
                    </div>
                    <div className='flex h-screen items-center justify-center'>
                        <div className='cursor-pointer p-2 lg:p-10' onClick={previousSlide}>
                            <TbSquareRoundedArrowLeft size={60}></TbSquareRoundedArrowLeft>
                        </div>
                        <div className='max-h-[1000px] max-w-[1000px]'>
                            <Image
                                src={slides[count].src}
                                alt={slides[count].alt}
                                width={1920}
                                height={1080}
                                className={`overflow-hidden rounded-xl object-cover object-center shadow-xl ${animating ? "opacity-0 transition-opacity duration-150 ease-in-out" : "opacity-100 transition-opacity duration-150 ease-in-out"} `}
                            ></Image>
                        </div>
                        <div className='cursor-pointer p-2 lg:p-10' onClick={nextSlide}>
                            <TbSquareRoundedArrowRight size={60}></TbSquareRoundedArrowRight>
                        </div>
                    </div>
                </div>
            </div>
            <div
                className={`max-w-[${w}px] float-right select-none space-y-2 pb-2 lg:mb-5 lg:ml-6`}
            >
                <div
                    className={`relative max-h-[${h}px] max-w-[${w}px] overflow-hidden rounded-xl`}
                >
                    <div
                        className={`group absolute left-0 h-full cursor-pointer ${isZoomed ? "z-20 h-full w-full bg-gray-200/95" : ""}`}
                        style={{ width: `${splitW(w)[1]}px` }}
                        onClick={previousSlide}
                    >
                        <div className='absolute left-0 h-full w-8 cursor-pointer group-hover:bg-gray-400/50'>
                            <RiArrowLeftWideFill
                                size='37'
                                className='absolute -left-1 top-1/2 -translate-y-1/2 fill-mainGreen opacity-0 group-hover:opacity-100'
                            />
                        </div>
                    </div>
                    <div
                        className={`absolute h-full cursor-zoom-in ${isZoomed ? "z-20 h-full w-full bg-gray-200/95" : ""}`}
                        style={{ width: `${splitW(w)[0]}px`, right: `${splitW(w)[1]}px` }}
                        onClick={handleClick}
                    ></div>
                    <div
                        className={`group absolute right-0 h-full cursor-pointer ${isZoomed ? "z-20 h-full w-full bg-gray-200/95" : ""}`}
                        style={{ width: `${splitW(w)[1]}px` }}
                        onClick={nextSlide}
                    >
                        <div className='absolute right-0 h-full w-8 cursor-pointer group-hover:bg-gray-400/50'>
                            <RiArrowRightWideFill
                                size='37'
                                className='absolute -right-1 top-1/2 -translate-y-1/2 fill-mainGreen opacity-0 group-hover:opacity-100'
                            />
                        </div>
                    </div>

                    <div className=''>
                        <Image
                            src={slides[count].src}
                            alt={slides[count].alt}
                            width={1920}
                            height={1080}
                            className={` h-[${h}px] w-[${w}px] object-cover opacity-0 shadow-lg ${animating ? "opacity-0 transition-opacity duration-150 ease-in-out" : "opacity-100 transition-opacity duration-150 ease-in-out"} `}
                        ></Image>
                    </div>
                </div>
                <hr />
                <div className={`flex max-w-[550px] max-w-[${w}px] justify-center space-x-2`}>
                    {slides.map((el, index) => {
                        return (
                            // el.id !== slides[count].id &&
                            <div key={el.id}>
                                <Image
                                    onClick={() => pickSlide(index)}
                                    src={el.src}
                                    alt={el.alt}
                                    width={1920}
                                    height={1080}
                                    className={`${count === index ? "scale-90 shadow-xl brightness-75" : "scale-100"} h-[50px] w-[70px] cursor-pointer rounded-md object-cover shadow-sm transition-transform duration-300 ease-in-out`}
                                ></Image>
                            </div>
                        )
                    })}
                </div>
            </div>
        </>
    )
}
