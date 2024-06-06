import prisma from "@/lib/client"

export function getPostById(id) {
    return prisma.post.findUnique({
        where: {
            id,
        },
    })
}
export function getAllPosts() {
    return prisma.post.findMany()
}

export function getAllCategories() {
    return prisma.category.findMany()
}
