import Link from "next/link"
import Image from "next/image"
import prisma from "@/lib/client"
import jsonData from "@/components/Data/data.json"

// const delay = (milliseconds) => {
//     return new Promise(resolve => setTimeout(resolve, milliseconds));
// };

// async function getNeosets() {
//     // const response = await fetch('http://localhost:3000/api/neosets')
//     // if (!response.ok) throw new Error("Unable to fetch Neosets.")
//     // return response.json()

//     // await delay(10000)

//     const neosets = await prisma.neoset.findMany()
//     return neosets
// }

export default async function Neosets() {
    return (
        <>
            {jsonData.map(product => (
                <Link key={product.name} href={`/catalogs/${product.href}`}>
                    <div className='group flex w-[265px] flex-col'>
                        <Image
                            src={product.photo_main}
                            alt='Neoset'
                            className='h-[170px] rounded-2xl object-cover object-center shadow-md transition duration-300 group-hover:-translate-y-3 group-hover:scale-105 group-hover:shadow-stone-300'
                            width={1280}
                            height={720}
                            priority
                        ></Image>
                        <h3 className='text-center text-xl font-semibold text-mainGreen transition duration-300 group-hover:-translate-y-1 group-hover:text-txtGreen'>
                            {product.runame}
                        </h3>
                    </div>
                </Link>
            ))}
        </>
    )
}
