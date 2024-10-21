'use client'
import parsedData from "@/components/Data/dataAcademy.json"
import Link from "next/link"
import { useState } from "react"
import Box from "@/components/Box"


const Categories = ({ children }) => {
    return (
        <div className='mb-5 flex flex-wrap gap-4'>
            <Link
                href="#"
                className={`text-nowrap rounded-full border border-primary_green bg-stone-50 px-3 py-2 text-lg font-semibold text-primary_green `}
            >

            </Link>
        </div>
    );
};
const Section = ({ children }) => {
    return (
        <div className='mb-3 flex gap-3'>
            <Link
                href='#'
                className={`my-1 rounded-full border border-gray-700 px-3 py-1`}
            >
                Секция
            </Link>
            <Link
                href='#'
                className={`my-1 rounded-full border border-gray-700 px-3 py-1`}
            >
                Секция
            </Link>
        </div>
    );
};

const Topic = ({ children }) => {
    return (
        <div className='mb-4 rounded-3xl bg-stone-300 p-4'>
            <Link href='#' className='flex items-center space-x-4'>
                <div className='h-12 w-12 rotate-45 overflow-hidden rounded-xl'>
                    <img
                        src='/logo_only.svg'
                        alt=''
                        className='h-12 w-12 -rotate-45 object-cover object-center'
                    />
                </div>
                <div className='text-xl font-semibold'>
                    {children}
                </div>
            </Link>
        </div>
    );
};


export default async function Academy() {


    const [isActiveSection, setIsActiveSection] = useState(0)
    const [isNameSection, setIsNameSection] = useState()
    const updateNameSection = (index, name) => {
        setIsActiveSection(index)
        // setIsNameSection(name)
    }
    // console.log()
    const [isActiveCat, setIsActiveCat] = useState(0)
    const [isActiveCatName, setIsActiveCatName] = useState()
    const [activeColor, setActiveColor] = useState(null);
    const rectangles = [
        { color: 'red', triangles: ['yellow', 'orange'] },
        { color: 'blue', triangles: ['yellow', 'orange'] },
        { color: 'green', triangles: ['yellow', 'orange'] },
    ];

    const circles = {
        yellow: <div className="circle yellow">1</div>,
        orange: <div className="circle orange">2</div>,
    };
    // console.log(parsedData)
    return (
        <>
            {/* <div className='container mx-auto max-w-[1200px] px-4'>
                <Categories></Categories>
                <div className='mb-3 flex gap-3'>
                    <div className='flex flex-col'>
                        <div className='my-2 rounded-3xl border bg-zinc-200 p-4'>
                            <h2 className='py-2 text-xl font-semibold'>Название категории</h2>
                            <Section></Section>
                            <Topic></Topic>
                        </div>
                    </div>
                </div>
            </div> */}
            <div>
                {parsedData.map((item) => (
                    <Box key={item.title} title={item.title} categories={item.categories} />
                ))}
            </div>
        </>
    )
}
