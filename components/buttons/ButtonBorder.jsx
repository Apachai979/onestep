export default function ButtonBorder({ textButton }) {
    return (
        <div className="px-10 py-4 text-2xl bg-white outline-0 text-mainGreen rounded-full font-semibold shadow-md hover:shadow-xl hover:shadow-mainGreen hover:-translate-y-1 transition-all duration-300">{textButton}</div>
    )
}