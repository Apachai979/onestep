'use client'
import Image from "next/image";
import { RiArrowLeftWideFill } from "react-icons/ri";
import { RiArrowRightWideFill } from "react-icons/ri";

export default function ImageCarousel() {

    return (
        <>
            <div className="w-[370px] space-y-2">
                <div className="relative h-[260px] w-[370px]">

                    <div className="absolute left-0 top-1/3">
                        <RiArrowLeftWideFill size="60" className="fill-mainGreen" />
                    </div>

                    <div className="absolute right-0 top-1/3">
                        <RiArrowRightWideFill size="60" className="fill-mainGreen" />
                    </div>

                    <div className="">
                        <Image
                            src='/academy/tabs/lab4.jpeg'
                            alt='Nurses'
                            width={1920}
                            height={1080}
                            className=' h-[260px] w-[370px] rounded-xl object-cover shadow-lg'
                        ></Image>
                    </div>

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