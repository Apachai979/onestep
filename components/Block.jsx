export default function Block({ children }) {
    return (
        <div className="container mx-auto px-4 max-w-[1200px]">
            {children}
        </div>
    )
}