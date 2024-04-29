export default function ButtonExtra({ textButton }) {
    return (
        <div className="px-24 py-4 rounded-full bg-body_bg border-2 border-primary_green text-primary_green transition duration-300 hover:text-white hover:bg-primary_green active:border-dark_green active:text-gray-600">{textButton}</div>
    )
}