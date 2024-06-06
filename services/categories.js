import prisma from "@/lib/client";

export function getAllCategories() {
    return prisma.category.findMany();
}