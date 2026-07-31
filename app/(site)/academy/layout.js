import BackAcademy from "@/components/forAcademy/BackAcademy"

export default function AcademyLayout({ children }) {
    return (
        <section>
            <div className='container mx-auto max-w-[1200px] px-2 sm:px-6'>
                <BackAcademy />
                {children}
            </div>
        </section>
    )
}
