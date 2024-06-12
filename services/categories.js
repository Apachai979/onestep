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

export function getCategories() {
    return prisma.category.findMany()
}
export function getSections() {
    return prisma.section.findMany()
}
