import Link from "next/link"
import { getAllCategories, getAllPosts } from "@/services/categories"
import BubbleBlock from "@/components/forAcademy/BubbleBlock"

export default async function Academy() {
    const categories = await getAllCategories()
    const posts = await getAllPosts()
    // console.log(categories[0].name)
    return (
        <div className='container mx-auto max-w-[1200px] px-4'>
            <div className='flex py-4'>
                <h1 className='text-4xl font-semibold text-txtGreen'>Академия OneStep</h1>
            </div>
            <BubbleBlock categories={categories} posts={posts}></BubbleBlock>
        </div>
    )
}
