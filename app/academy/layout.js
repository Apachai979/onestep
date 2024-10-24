import BackAcademy from "@/components/forAcademy/BackAcademy"

export default function AcademyLayout({ children }) {
    return (
        <section>
            <div className='container mx-auto max-w-[1200px] px-6 py-4'>
                {/* <div className='flex py-4'>
                    <h1 className='text-4xl font-semibold text-txtGreen'>Академия OneStep</h1>
                </div> */}
                <BackAcademy />
                {children}
            </div>
        </section>
    )
}
