import Link from "next/link"
import { getSections, getCategories, getPosts } from "@/services/categories"
import BubbleBlock from "@/components/forAcademy/BubbleBlock"

export default async function Academy() {
    const categories = await getCategories()
    const posts = await getPosts()
    const sections = await getSections()
    // console.log('cat ', categories)
    return (
        <div className='container mx-auto max-w-[1200px] px-4'>
            <div className='flex py-4'>
                <h1 className='text-4xl font-semibold text-txtGreen'>Академия OneStep</h1>
                <Link href="academy/treatment_of_wounds_with_neoset">href</Link>
            </div>
            <BubbleBlock categories={categories} posts={posts} sections={sections}></BubbleBlock>
        </div>
    )
}
