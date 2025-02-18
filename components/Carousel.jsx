'use client';
import Image from 'next/image';
import sliderShape from '@/public/sliderImage/sliderShape.svg';
import { useState, useEffect } from 'react';
import { FaChevronCircleLeft, FaChevronCircleRight } from 'react-icons/fa';
import Link from 'next/link';

const slides = [
    {
        id: 1,
        description: 'Одноразовые процедурные стерильные наборы',
        buttonName: 'Посмотреть каталог',
        src: '/sliderImage/machine.png',
        href: '/catalogs',
    },
    {
        id: 2,
        description: 'Собственное производство',
        buttonName: 'Ознакомиться',
        src: '/sliderImage/marla.png',
        href: '/manufacture',
    },
    {
        id: 3,
        description: 'Сырьё и материалы',
        buttonName: 'Подробнее',
        src: '/sliderImage/medsisters.png',
        href: '/manufacture#storage',
    },
    {
        id: 4,
        description: 'Стерильность и безопасность',
        buttonName: 'Подробнее',
        src: '/sliderImage/nabor.png',
        href: '/manufacture#sterility',
    },
    {
        id: 5,
        description: 'Полезное для профессионалов',
        buttonName: 'Подробнее',
        src: '/sliderImage/proc.png',
        href: '/partners/specialist',
    },
];

export default function Carousel() {
    const [slide, setSlide] = useState(1);

    const previousSlide = () => {
        setSlide((prev) => (prev === 1 ? slides.length : prev - 1));
    };

    const nextSlide = () => {
        setSlide((prev) => (prev === slides.length ? 1 : prev + 1));
    };

    useEffect(() => {
        const interval = setInterval(nextSlide, 6000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="container mx-auto px-4">
            <div className="select-none max-w-[1160px] h-120 justify-center m-auto my-5 relative rounded-3xl overflow-hidden z-0 drop-shadow-md">
                {slides.map((el) => (
                    <div
                        key={el.id}
                        className={
                            slide === el.id
                                ? 'absolute lg:left-8 bottom-0 lg:top-0 lg:bottom-0 flex lg:flex-col flex-row w-full px-5 lg:mx-0 lg:w-[450px] h-40 lg:h-120 z-40 transition opacity-1 duration-700 ease-in'
                                : 'absolute lg:left-8 bottom-0 lg:top-0 lg:bottom-0 flex lg:flex-col flex-row w-full px-5 lg:mx-0 lg:w-[450px] h-40 lg:h-120 z-30 transition opacity-0 duration-700'
                        }
                    >
                        <div className="flex space-x-4 lg:justify-normal m-auto md:flex-col items-center">
                            <h1 className="text-white select-none font-semibold text-xl sm:text-2xl lg:text-4xl self-center lg:self-end pb-2 lg:pb-0">
                                {el.description}
                            </h1>
                            <Link
                                href={el.href}
                                className="self-center select-none lg:self-start lg:mt-5 text-center py-2.5 px-5 lg:w-64 bg-white rounded-full text-stone-700 text-md sm:text-xl transition duration-300 border-2 border-primary_green hover:text-white hover:bg-primary_green hover:border-2 hover:border-white active:border-dark_green"
                            >
                                {el.buttonName}
                            </Link>
                        </div>
                    </div>
                ))}

                <Image
                    src={sliderShape}
                    alt=""
                    className="absolute lg:left-0 invisible lg:visible h-120 w-auto z-20"
                    width={1280}
                    height={720}
                    priority
                />

                <div className="absolute left-0 bottom-0 w-full h-40 bg-primary_green z-20 visible lg:invisible"></div>

                {slides.map((el) => (
                    <Image
                        key={el.id}
                        src={el.src}
                        alt="Neoset"
                        className={
                            slide === el.id
                                ? 'absolute right-0 object-cover h-120 w-auto z-10 opacity-1 transition duration-1000'
                                : 'absolute right-0 object-cover h-120 w-auto z-10 opacity-0 transition duration-1000'
                        }
                        width={1043}
                        height={569}
                        priority
                    />
                ))}

                <div className="absolute bottom-0 lg:bottom-6 lg:left-10 flex items-center justify-center lg:space-x-5 w-full lg:w-auto">
                    <div className="flex lg:space-x-3 lg:visible invisible w-0 lg:w-auto">
                        <button
                            onClick={previousSlide}
                            aria-label="Предыдущий слайд"
                            className="flex h-8 w-8 outline-0 rounded-full justify-center items-center p-4 z-50 bg-dark_green hover:bg-night_green transition duration-300 active:scale-95"
                        >
                            <FaChevronCircleLeft className="absolute fill-white transition duration-300" size="34" />
                        </button>

                        <button
                            onClick={nextSlide}
                            aria-label="Следующий слайд"
                            className="flex h-8 w-8 outline-0 rounded-full justify-center items-center p-4 z-50 bg-dark_green hover:bg-night_green transition duration-300 active:scale-95"
                        >
                            <FaChevronCircleRight className="absolute fill-white transition duration-300" size="34" />
                        </button>
                    </div>

                    <div className="flex space-x-2 justify-self-center">
                        {slides.map((elem) => (
                            <button
                                key={elem.id}
                                onClick={() => setSlide(elem.id)}
                                className={
                                    slide === elem.id
                                        ? 'w-3 h-3 rounded-full border-2 border-white bg-white cursor-pointer z-50'
                                        : 'w-3 h-3 rounded-full border-2 border-white hover:bg-white cursor-pointer z-50'
                                }
                                aria-label={`Перейти к слайду ${elem.id}`}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}