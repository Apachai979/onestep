export default function ButtonExtra({ textButton }) {
    return (
        <div className='rounded-full border-2 border-primary_green bg-body_bg px-24 py-4 text-xl font-semibold text-primary_green transition duration-300 hover:bg-primary_green hover:text-white active:scale-95 active:border-dark_green active:text-gray-600'>
            {textButton}
        </div>
    )
}
