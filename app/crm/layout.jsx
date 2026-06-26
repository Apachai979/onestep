import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/configs/auth"
import CrmShell from "@/components/crm/CrmShell"

export const metadata = {
    title: "CRM",
}

export default async function CrmLayout({ children }) {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
        redirect("/authorize?callbackUrl=/crm")
    }
    const role = session.user.role
    if (role !== "MANAGER" && role !== "ADMIN") {
        redirect("/")
    }

    return (
        <CrmShell user={session.user} role={role}>
            {children}
        </CrmShell>
    )
}
