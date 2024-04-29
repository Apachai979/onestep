export async function GET(request) {

    const neosets = [
        { name: 'Набор для снятия швов', srcImg: '/catalog/aneste.jpg', href: 'dlya-snyatiya-shvov' },
        { name: 'Набор для обработки ран', srcImg: '/catalog/aneste.jpg', href: 'dlya-obrabotki-ran' },
        { name: 'Набор для забора донорской крови', srcImg: '/catalog/aneste.jpg', href: 'dlya-zabora-donorskoj-krovi' },
        { name: 'Набор для забора крови из вены', srcImg: '/catalog/aneste.jpg', href: 'dlya-zabora-krovi-iz-veny' },
        { name: 'Набор для катетеризации мочевого пузыря', srcImg: '/catalog/aneste.jpg', href: 'dlya-kateterizacii-mochevogo-puzyrya' },
        { name: 'Набор для катетеризации центральных вен', srcImg: '/catalog/aneste.jpg', href: 'dlya-kateterizacii-centralnyh-ven' },
        { name: 'Набор для локальной анестезии', srcImg: '/catalog/aneste.jpg', href: 'dlya-lokalnoj-anestezii' },
        { name: 'Набор для гемодиализа', srcImg: '/catalog/aneste.jpg', href: 'dlya-gemodializa' },
    ]

    return new Response(JSON.stringify(neosets))
}