import ButtonBorder from "./buttons/ButtonBorder"
import ButtonOpenForm from "./buttons/ButtonOpenForm"

export default function ConnectWithUs({ title, textButton, titleForForm }) {
    return (
        <>
            <div className='container mx-auto my-3 sm:my-8 px-14'>
                <div className="flex flex-col tracking-wide items-center justify-center space-y-5 rounded-3xl bg-[url('/partners/bg.jpg')] bg-cover bg-no-repeat px-4 py-8 sm:py-10 md:space-y-10 md:p-10">
                    <h1 className='text-center font-semibold leading-tight text-white md:text-[40px]'>
                        {title}
                    </h1>
                    <ButtonOpenForm titleForForm={titleForForm}>
                        <ButtonBorder textButton={textButton}></ButtonBorder>
                    </ButtonOpenForm>
                </div>
            </div>
        </>
    )
}
