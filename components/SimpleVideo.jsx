const SimpleVideo = () => {
    return (
        <video
            autoPlay
            muted
            loop
            playsInline
            className='h-full w-full object-cover object-center'
        >
            <source src='/videos/onestepvideo.webm' type='video/webm' />
        </video>
    )
}

export { SimpleVideo }
