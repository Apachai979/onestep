'use client'
import Image from "next/image";
import { RiArrowLeftWideFill } from "react-icons/ri";
import { RiArrowRightWideFill } from "react-icons/ri";
import { useState } from "react";

const slides = [
    {
        id: 1,
        alt: '',
        src: '/academy/tabs/lab.jpeg',
    },
    {
        id: 2,
        alt: '',
        src: '/academy/tabs/lab2.jpeg',
    },
    {
        id: 3,
        alt: '',
        src: '/academy/tabs/lab3.jpeg',
    },
    {
        id: 4,
        alt: '',
        src: '/academy/tabs/lab4.jpeg',
    }
]


export default function ImageCarousel() {



    const [slide, setSlide] = useState(slides[0])
    console.log(slides[slides.length - 1])
    const previousSlide = () => {
        if (slide.id == slides[0].id) setSlide(slides[slides.length - 1])
        else setSlide(slides[slide.id - 1])
    }

    const nextSlide = () => {
        if (slide.id == slides[slides.length - 1].id) setSlide(slides[0])
        else setSlide(slides[slide.id + 1])
    }

    return (
        <>
            <div className="w-[370px] space-y-2">
                <div className="relative h-[260px] w-[370px]">

                    <div className="absolute left-0 top-1/2 -translate-y-1/2" onClick={previousSlide}>
                        <RiArrowLeftWideFill size="60" className="fill-mainGreen" />
                    </div>

                    <div className="absolute right-0 top-1/2 -translate-y-1/2" onClick={nextSlide}>
                        <RiArrowRightWideFill size="60" className="fill-mainGreen" />
                    </div>

                    <div className="">
                        <Image
                            src={slide.src}
                            alt={slide.alt}
                            width={1920}
                            height={1080}
                            className=' h-[260px] w-[370px] rounded-xl object-cover shadow-lg'
                        ></Image>
                    </div>

                </div>
                <div className="flex justify-center space-x-2 mx-4">
                    {slides.map((el) => {
                        return (
                            el.id !== slide.id &&
                            <div key={el.id}>
                                <Image onClick={() => setSlide(el)}
                                    src={el.src}
                                    alt={el.alt}
                                    width={1920}
                                    height={1080}
                                    className='first:skew-y-3 h-[50px] w-[70px] rounded-md object-cover shadow-sm'
                                ></Image>
                            </div>
                        )
                    })}
                </div>
                <div className="flex justify-center space-x-2 mx-4">
                    <div><Image
                        src='/academy/tabs/lab.jpeg'
                        alt='Nurses'
                        width={1920}
                        height={1080}
                        className='skew-y-3 h-[50px] w-[70px] rounded-md object-cover shadow-sm'
                    ></Image></div>
                    <div><Image
                        src='/academy/tabs/lab2.jpeg'
                        alt='Nurses'
                        width={1920}
                        height={1080}
                        className='h-[50px] w-[70px] rounded-md object-cover shadow-sm'
                    ></Image></div>
                    <div><Image
                        src='/academy/tabs/lab3.jpeg'
                        alt='Nurses'
                        width={1920}
                        height={1080}
                        className='-skew-y-3 h-[50px] w-[70px] rounded-md object-cover shadow-sm'
                    ></Image></div>
                </div>
            </div>
        </>
    )
}