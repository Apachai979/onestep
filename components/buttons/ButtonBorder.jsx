export default function ButtonBorder({ textButton }) {
    return (
        <div className="px-8 py-4 text-xl sm:text-2xl tracking-wide bg-white text-mainGreen rounded-full font-semibold shadow-md  hover:shadow-neon hover:-translate-y-0.5 transition-all duration-300 ease-in-out active:scale-95">{textButton}</div>
    )
}