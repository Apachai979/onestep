import Link from "next/link"
import parsedData from "@/components/Data/dataAcademy.json"
import AcademyCategoriesHeader from "@/components/AcademyCategoriesHeader"


export async function generateStaticParams() {
    return parsedData.map(cat => ({
        slug: "/academy/" + cat.href,
    }))
}

export default async function Categories({ params }) {


    const [m1, m2, m3, m4] = parsedData
    console.log("m1", m1)
    console.log("m2", m2)
    console.log("m3", m3)
    console.log("m4", m4)
    const cat = parsedData.find(el => el.href == params.categories)
    // console.log("/academy/" + cat.href)
    return (
        <div className='container mx-auto max-w-[1200px] px-4'>
            <div className='mb-3 flex gap-3'>
                <div className='flex flex-col'>
                    <div className='my-2 rounded-3xl border bg-zinc-200 p-4'>

                        {/* //Title Category */}
                        <h2 className='py-2 text-xl font-semibold'>{m1.title}</h2>

                        {/* //sections */}
                        <div className='mb-3 flex gap-3'>
                            {m1.categories.map(cat => (
                                <>
                                    {cat.name}
                                </>
                            ))}
                        </div>

                        {/* // topics */}
                        { }
                        <div className='mb-4 rounded-3xl bg-stone-300 p-4'>
                            <Link href='#' className='flex items-center space-x-4'>
                                <div className='h-12 w-12 rotate-45 overflow-hidden rounded-xl'>
                                    <img
                                        src='/logo_only.svg'
                                        alt=''
                                        className='h-12 w-12 -rotate-45 object-cover object-center'
                                    />
                                </div>
                                <div className='text-xl font-semibold'>Post Title</div>
                            </Link>
                        </div>


                    </div>
                </div>
            </div>
        </div>
    )
}
