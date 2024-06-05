export default function ButtonBorder({ textButton }) {
    return (
        <div className="px-10 py-4 text-2xl bg-white text-mainGreen rounded-full font-semibold shadow-md  hover:shadow-neon hover:-translate-y-0.5 transition-all duration-300 ease-in-out active:scale-95">{textButton}</div>
    )
}