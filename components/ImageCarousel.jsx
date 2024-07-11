'use client'
import Image from "next/image";
import { RiArrowLeftWideFill } from "react-icons/ri";
import { RiArrowRightWideFill } from "react-icons/ri";
import { RiCloseLargeLine } from "react-icons/ri";
import { TbSquareRoundedArrowLeft } from "react-icons/tb";
import { TbSquareRoundedArrowRight } from "react-icons/tb";
import { useState } from "react";

const baseSlides = [
    {
        id: 0,
        alt: '',
        src: '/academy/tabs/lab.jpeg',
    },
    {
        id: 1,
        alt: '',
        src: '/academy/tabs/lab2.jpeg',
    },
    {
        id: 2,
        alt: '',
        src: '/academy/tabs/lab3.jpeg',
    },
    {
        id: 3,
        alt: '',
        src: '/academy/tabs/lab4.jpeg',
    }
]

const splitW = (w) => {
    let a = Math.floor(0.56 * w);  // Округление вниз до ближайшего целого
    let b = Math.floor(0.22 * w);  // Округление вниз до ближайшего целого
    let c = Math.floor(0.22 * w);  // Округление вниз до ближайшего целого

    let total = a + b + c;

    // Корректируем значения, чтобы их сумма была равна w
    if (total < w) {
        let difference = w - total;
        a += difference;  // Добавляем разницу к одной из переменных (например, a)
    } else if (total > w) {
        let difference = total - w;
        a -= difference;  // Вычитаем разницу из одной из переменных (например, a)
    }

    return [a, b];
}

export default function ImageCarousel({ slides = baseSlides, w = '400', h = '280' }) {

    const [count, setCount] = useState(0)
    const [animating, setAnimating] = useState(false);
    const [isZoomed, setIsZoomed] = useState(false);

    const handleClick = () => {
        setIsZoomed(!isZoomed);
    };

    const previousSlide = () => {
        if (!animating) {
            setAnimating(true);
            setTimeout(() => {
                setCount((count - 1 + slides.length) % slides.length);
                setAnimating(false);
            }, 150); // Duration of the animation
        }
    }
    const previousImage = () => {
        setCount((count - 1 + slides.length) % slides.length);
    }
    const nextImage = () => {
        setCount((count - 1 + slides.length) % slides.length);
    }


    const nextSlide = () => {
        if (!animating) {
            setAnimating(true);
            setTimeout(() => {
                setCount((count + 1) % slides.length);
                setAnimating(false);
            }, 150); // Duration of the animation
        }
    }

    const pickSlide = (index) => {
        if (!animating) {
            setAnimating(true);
            setTimeout(() => {
                setCount(index);
                setAnimating(false);
            }, 150); // Duration of the animation
        }
    }

    return (
        <>
            <div className={`${isZoomed ? 'visible' : ' invisible'} select-none`}>
                <div className="fixed z-30 left-0 right-0 top-0 bottom-0 mx-auto my-auto backdrop-blur-md bg-gray-500/60 ">
                    <div className="absolute right-12 top-10 text-2xl cursor-pointer p-6 lg:py-36 lg:px-24 z-20" onClick={handleClick}>
                        <RiCloseLargeLine size={35} className="absolute top-3 right-3 lg:top-5 lg:right-5"></RiCloseLargeLine>
                    </div>
                    <div className="h-screen flex items-center justify-center">
                        <div className=" cursor-pointer p-2 lg:p-10 " onClick={previousSlide}>
                            <TbSquareRoundedArrowLeft size={60}></TbSquareRoundedArrowLeft>
                        </div>
                        <div className="max-w-[1000px] max-h-[1000px]">
                            <Image
                                src={slides[count].src}
                                alt={slides[count].alt}
                                width={1920}
                                height={1080}
                                className={`rounded-xl shadow-xl overflow-hidden object-cover object-center ${animating ? 'opacity-0 transition-opacity ease-in-out duration-150' : 'opacity-100 transition-opacity ease-in-out duration-150'} `}
                            ></Image>
                        </div>
                        <div className="cursor-pointer p-2 lg:p-10 " onClick={nextSlide}>
                            <TbSquareRoundedArrowRight size={60}></TbSquareRoundedArrowRight>
                        </div>
                    </div>
                </div>
            </div>
            <div className={`w-[${w}px] space-y-2 select-none float-right ml-6 mb-5`}>
                <div className={`relative h-[${h}px] w-[${w}px] rounded-xl overflow-hidden`}>
                    <div className={`absolute left-0 h-full cursor-pointer group ${isZoomed ? 'bg-gray-200/95 w-full h-full z-20' : ''}`} style={{ width: `${splitW(w)[1]}px` }} onClick={previousSlide}>
                        <div className="absolute left-0 w-8 h-full group-hover:bg-gray-400/50 cursor-pointer" >
                            <RiArrowLeftWideFill size="37" className="opacity-0 fill-mainGreen -left-1 absolute top-1/2 -translate-y-1/2 group-hover:opacity-100" />
                        </div>
                    </div>
                    <div className={`absolute cursor-zoom-in h-full ${isZoomed ? 'bg-gray-200/95 w-full h-full z-20' : ''}`} style={{ width: `${splitW(w)[0]}px`, right: `${splitW(w)[1]}px` }} onClick={handleClick}></div>
                    <div className={`absolute right-0 h-full cursor-pointer group ${isZoomed ? 'bg-gray-200/95 w-full h-full z-20' : ''}`} style={{ width: `${splitW(w)[1]}px` }} onClick={nextSlide}>
                        <div className="absolute right-0 w-8 h-full group-hover:bg-gray-400/50 cursor-pointer" >
                            <RiArrowRightWideFill size="37" className="opacity-0 fill-mainGreen absolute -right-1 top-1/2 -translate-y-1/2 group-hover:opacity-100" />
                        </div>
                    </div>

                    <div className="">
                        <Image
                            src={slides[count].src}
                            alt={slides[count].alt}
                            width={1920}
                            height={1080}
                            className={` h-[${h}px] w-[${w}px] object-cover shadow-lg opacity-0 ${animating ? 'opacity-0 transition-opacity ease-in-out duration-150' : 'opacity-100 transition-opacity ease-in-out duration-150'} `}
                        ></Image>
                    </div>

                </div>
                <hr />
                <div className="flex justify-center space-x-2 mx-4">
                    {slides.map((el, index) => {
                        return (
                            // el.id !== slides[count].id &&
                            <div key={el.id}>
                                <Image onClick={() => pickSlide(el.id)}
                                    src={el.src}
                                    alt={el.alt}
                                    width={1920}
                                    height={1080}
                                    className={`${count === index ? ' scale-90 brightness-75 shadow-xl' : 'scale-100'} h-[50px] w-[70px] rounded-md object-cover shadow-sm cursor-pointer duration-300 ease-in-out transition-transform`}
                                ></Image>
                            </div>
                        )
                    })}
                </div>
            </div >
        </>
    )
}