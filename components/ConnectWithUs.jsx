import ButtonBorder from "./buttons/ButtonBorder"
import ButtonOpenForm from "./buttons/ButtonOpenForm"

export default function ConnectWithUs({ title, textButton, titleForForm }) {

    return (
        <>
            < div className="container mx-auto px-14 my-14">
                <div className="flex flex-col items-center justify-center space-y-5 md:space-y-10 px-4 py-10 md:p-10 bg-cover bg-no-repeat rounded-3xl bg-[url('/partners/bg.jpg')]">
                    <h1 className='md:text-[40px] text-center text-white font-semibold leading-tight'>{title}</h1>
                    <ButtonOpenForm titleForForm={titleForForm}><ButtonBorder textButton={textButton}></ButtonBorder></ButtonOpenForm>
                </div>
            </div >
        </>
    )
}