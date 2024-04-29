import ButtonExtra from "./buttons/ButtonExtra"
import ButtonOpenForm from "./buttons/ButtonOpenForm"

export default function ConnectUs({ title, txtbutton }) {
    return (
        <div className='container mx-auto px-4 py-10'>
            <div className="flex flex-col lg:flex-row space-y-4 lg:space-y-0 justify-center items-center text-xl space-x-10">
                <h2>{title}</h2>
                <ButtonOpenForm><ButtonExtra textButton={txtbutton}></ButtonExtra></ButtonOpenForm>
            </div>
        </div>
    )
}