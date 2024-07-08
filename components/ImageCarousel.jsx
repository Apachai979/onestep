'use client'
import Image from "next/image";
import { RiArrowLeftWideFill } from "react-icons/ri";
import { RiArrowRightWideFill } from "react-icons/ri";
import { useState } from "react";

const slides = [
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


export default function ImageCarousel() {

    const [count, setCount] = useState(0)
    const [animating, setAnimating] = useState(false);


    console.log(slides.length)

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
            <div className="w-[370px] space-y-2 select-none">
                <div className="relative h-[260px] w-[370px] rounded-xl overflow-hidden">

                    <div className="absolute left-0 w-8 h-full group hover:bg-gray-400/50 cursor-pointer" onClick={previousSlide}>
                        <RiArrowLeftWideFill size="45" className="fill-mainGreen -left-2 absolute top-1/2 -translate-y-1/2 group-hover:scale-90" />
                    </div>

                    <div className="absolute right-0 w-8 h-full group hover:bg-gray-400/50 cursor-pointer" onClick={nextSlide}>
                        <RiArrowRightWideFill size="45" className="fill-mainGreen absolute -right-2 top-1/2 -translate-y-1/2 group-hover:scale-90" />
                    </div>

                    <div className="">
                        <Image
                            src={slides[count].src}
                            alt={slides[count].alt}
                            width={1920}
                            height={1080}
                            className={`slide h-[260px] w-[370px] object-cover shadow-lg  ${animating ? 'opacity-10 transition duration-500' : ''}`}
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
            </div>
        </>
    )
}