// Фоновый ролик о производстве. Источники намеренно в таком порядке:
// webm/VP9 легче, его берут Chrome, Firefox, Edge и Safari 16+; mp4/H.264 —
// запасной вариант для Safari до 16 и старых iOS, которые VP9 не проигрывают.
// muted + playsInline обязательны, иначе Safari не даст автозапуск.
const SimpleVideo = () => {
    return (
        <video
            autoPlay
            muted
            loop
            playsInline
            poster='/videos/onestepvideo-poster.jpg'
            className='h-full w-full object-cover object-center'
        >
            <source src='/videos/onestepvideo.webm' type='video/webm' />
            <source src='/videos/onestepvideo.mp4' type='video/mp4' />
        </video>
    )
}

export { SimpleVideo }
