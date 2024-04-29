import { Suspense } from 'react'
export default function Video() {
    return (
        <>
            <Suspense fallback={<p>Loading video...</p>}>
                <iframe
                    src="https://youtu.be/Bx40BgjobMg"
                    allowfullscreen
                    className='w-full'
                />
            </Suspense>
        </>
    )
}