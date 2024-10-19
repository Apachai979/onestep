import Link from "next/link"
import Image from "next/image"
import prisma from "@/lib/client"
import jsonData from "@/components/Data/data.json"


// const delay = (milliseconds) => {
//     return new Promise(resolve => setTimeout(resolve, milliseconds));
// };

async function getNeosets() {
    // const response = await fetch('http://localhost:3000/api/neosets')
    // if (!response.ok) throw new Error("Unable to fetch Neosets.")
    // return response.json()

    // await delay(10000)

    const neosets = await prisma.neoset.findMany()
    return neosets
}

export default async function Neosets() {
    const jsonString = JSON.stringify(jsonData); // Превращаем объект в строку JSON
    const parsedData = JSON.parse(jsonString); // Превращаем строку обратно в объект
    // console.log(parsedData)
    const products = await getNeosets()

    return (
        <>
            {
                parsedData.map((product) => (
                    <Link key={product.name} href={`/catalogs/${product.href}`}>
                        <div className="flex flex-col w-[265px] group">
                            <Image
                                src={product.photo_main}
                                alt="Neoset"
                                className="object-cover object-center rounded-2xl h-[170px] shadow-md  transition duration-300 group-hover:shadow-stone-300 group-hover:-translate-y-3 group-hover:scale-105"
                                width={1280}
                                height={720}
                                priority>
                            </Image>
                            <h3 className='text-mainGreen text-xl font-semibold text-center transition duration-300 group-hover:text-txtGreen group-hover:-translate-y-1'>{product.runame}</h3>
                        </div>
                    </Link>
                ))
            }
        </>
    )
}