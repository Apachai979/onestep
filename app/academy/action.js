"use server"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import prisma from "@/lib/client"

export async function createPost(data) {
    const post = await prisma.post.create({
        data: {
            title,
            content,
            photoUrl,
            categoryId,
            sectionId,
            createdAt,
            updatedAt,
            category,
            section,
        },
    })
    redirect(`/academy/${post.id}`)
}
export async function updatePost(data) {}
export async function removePost(data) {}
