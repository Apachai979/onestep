import Link from "next/link"
import { getAllCategories } from "@/services/categories"
import BubbleBlock from "@/components/forAcademy/BubbleBlock"

export default async function Academy() {

    const categories = await getAllCategories()
    console.log(categories[0].name)
    return (
        <>
            <BubbleBlock data={categories}></BubbleBlock>
        </>
    )

}
