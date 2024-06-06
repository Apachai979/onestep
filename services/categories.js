import prisma from "@/lib/client";

export function getAllCategories() {
    return prisma.category.findMany();
}
export function getAllPosts() {
    return prisma.post.findMany();
}