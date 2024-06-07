import prisma from "@/lib/client"

export function getPostById(id) {
    return prisma.post.findUnique({
        where: {
            id,
        },
    })
}

export function getPosts() {
    return prisma.post.findMany({
        include: {
            category: true,
            section: true,
        },
    })
};

export function getAllCategories() {
    return prisma.category.findMany()
}
