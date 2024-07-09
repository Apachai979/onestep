'use client'
import Image from "next/image";
import { RiArrowLeftWideFill } from "react-icons/ri";
import { RiArrowRightWideFill } from "react-icons/ri";
import { useState } from "react";
import Modal from "./Modal";

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
            }, 300); // Duration of the animation
        }
    }

    const nextSlide = () => {
        if (!animating) {
            setAnimating(true);
            setTimeout(() => {
                setCount((count + 1) % slides.length);
                setAnimating(false);
            }, 300); // Duration of the animation
        }
    }

    const pickSlide = (index) => {
        if (!animating) {
            setAnimating(true);
            setTimeout(() => {
                setCount(index);
                setAnimating(false);
            }, 300); // Duration of the animation
        }
    }

    return (
        <>
            <div className={`w-[${w}px] space-y-2 select-none float-right ml-6 mb-5`}>
                <div className={`relative h-[${h}px] w-[${w}px] rounded-xl overflow-hidden`}>
                    <div className={`absolute left-0 h-full cursor-pointer group `} style={{ width: `${splitW(w)[1]}px` }} onClick={previousSlide}>
                        <div className="absolute left-0 w-8 h-full group-hover:bg-gray-400/50 cursor-pointer" >
                            <RiArrowLeftWideFill size="37" className="opacity-0 fill-mainGreen -left-1 absolute top-1/2 -translate-y-1/2 group-hover:opacity-100" />
                        </div>
                    </div>

                    <div className={`absolute cursor-zoom-in bg-red-200 h-full ${isZoomed ? 'transform scale-150 z-50' : ''}`} style={{ width: `${splitW(w)[0]}px`, right: `${splitW(w)[1]}px` }} onClick={handleClick}></div>

                    <div className={`absolute right-0 h-full cursor-pointer group`} style={{ width: `${splitW(w)[1]}px` }} onClick={nextSlide}>
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
                            className={`slide h-[${h}px] w-[${w}px] object-cover shadow-lg  ${animating ? 'opacity-10 transition duration-500' : ''} `}
                        ></Image>
                    </div>

                </div>
                <hr />
                <div className="flex justify-center space-x-2 mx-4">
                    {slides.map((el, index) => {
                        const isLastElement = index === slides.length - 1;
                        return (
                            el.id !== slides[count].id &&
                            <div key={el.id}>
                                <Image onClick={() => pickSlide(el.id)}
                                    src={el.src}
                                    alt={el.alt}
                                    width={1920}
                                    height={1080}
                                    className={`${index == 0 && 'skew-y-3'} ${index === slides.length - 1 && '-skew-y-3'} h-[50px] w-[70px] rounded-md object-cover shadow-sm cursor-pointer`}
                                ></Image>
                            </div>
                        )
                    })}
                </div>
            </div >
        </>
    )
}