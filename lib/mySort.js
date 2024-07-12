async function mySort(array, prioritySrc) {
    return array.sort((a, b) => {
        const fileNameA = a.src.split("/").pop()
        const fileNameB = b.src.split("/").pop()
        let priorityIndexA = prioritySrc.indexOf(fileNameA)
        let priorityIndexB = prioritySrc.indexOf(fileNameB)

        if (priorityIndexA === -1) priorityIndexA = Infinity
        if (priorityIndexB === -1) priorityIndexB = Infinity

        return priorityIndexA - priorityIndexB
    })
}

module.exports = mySort
