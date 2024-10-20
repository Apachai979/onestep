import parsedData from "@/components/Data/dataAcademy.json"
import Link from "next/link"

export default async function Academy() {
    console.log(parsedData)
    return (
        <div className='container mx-auto max-w-[1200px] px-4'>
            <div className='mb-3 flex gap-3'>
                <div className='flex flex-col'>
                    {parsedData.map(el => (
                        <div key={el.title} className='my-2 rounded-3xl border bg-zinc-200 p-4'>
                            <h2 className='py-2 text-xl font-semibold'>{el.title}</h2>
                            <div className='mb-3 flex gap-3'>
                                {el.categories.map(cat => (
                                    <Link
                                        key={cat.name}
                                        href='#'
                                        className={`my-1 rounded-full border border-gray-700 px-3 py-1`}
                                    >
                                        {cat.name}
                                    </Link>
                                ))}
                            </div>

                            {el.categories.map(cat => (
                                <div key={cat.name}>
                                    {cat.topics.map(topic => (
                                        <div
                                            key={topic.title}
                                            className='mb-4 rounded-3xl bg-stone-300 p-4'
                                        >
                                            <Link href='#' className='flex items-center space-x-4'>
                                                <div className='h-12 w-12 rotate-45 overflow-hidden rounded-xl'>
                                                    <img
                                                        src='/logo_only.svg'
                                                        alt=''
                                                        className='h-12 w-12 -rotate-45 object-cover object-center'
                                                    />
                                                </div>

                                                <div className='text-xl font-semibold'>
                                                    {topic.title}
                                                </div>
                                            </Link>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
