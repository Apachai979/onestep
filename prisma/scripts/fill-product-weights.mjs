import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

// Per transport-pack values (kg / m3) as provided by user.
const PACK_DATA = {
    "NS-001-01": { weight: 1.4, volume: 0.027 },
    "NS-001-02": { weight: 1.5, volume: 0.027 },
    "NS-002-01": { weight: 1.8, volume: 0.031 },
    "NS-002-02": { weight: 1.5, volume: 0.027 },
    "NS-003-01": { weight: 2.4, volume: 0.031 },
    "NS-003-02": { weight: 2.5, volume: 0.031 },
    "NS-004-01": { weight: 1.5, volume: 0.027 },
    "NS-004-02": { weight: 1.4, volume: 0.027 },
    "NS-004-03": { weight: 1.7, volume: 0.027 },
    "NS-005-01": { weight: 2.6, volume: 0.031 },
    "NS-005-02": { weight: 2.8, volume: 0.031 },
    "NS-006-01": { weight: 2.8, volume: 0.04 },
    "NS-006-02": { weight: 3.1, volume: 0.04 },
    "NS-006-021": { weight: 3.1, volume: 0.04 },
    "NS-006-022": { weight: 3.1, volume: 0.04 },
    "NS-006-03": { weight: 4.1, volume: 0.04 },
    "NS-006-031": { weight: 4.1, volume: 0.04 },
    "NS-007-01": { weight: 2.6, volume: 0.04 },
    "NS-007-02": { weight: 2.7, volume: 0.04 },
    "NS-007-021": { weight: 2.7, volume: 0.04 },
    "NS-008-01": { weight: 1.9, volume: 0.031 },
    "NS-008-02": { weight: 2.1, volume: 0.031 },
    "NS-008-03": { weight: 2.4, volume: 0.031 },
    "NS-008-04": { weight: 2.2, volume: 0.031 },
    "SL-35-05": { weight: 1.9, volume: 0.04 },
    "SL-35-10": { weight: 2.1, volume: 0.04 },
    "SLR-35-05": { weight: 1.9, volume: 0.04 },
    "SLR-35-10": { weight: 2.1, volume: 0.04 },
}

function round(n, digits) {
    const m = 10 ** digits
    return Math.round(n * m) / m
}

async function main() {
    const updates = []
    const missing = []
    const noQty = []
    const totals = { matched: 0, updated: 0 }

    for (const [sku, { weight, volume }] of Object.entries(PACK_DATA)) {
        const product = await prisma.product.findUnique({ where: { sku } })
        if (!product) {
            missing.push(sku)
            continue
        }
        totals.matched++
        const qty = product.transportPackQty || 0
        if (qty <= 0) {
            noQty.push(sku)
            continue
        }
        const unitWeight = round(weight / qty, 4)
        const unitVolume = round(volume / qty, 6)
        await prisma.product.update({
            where: { id: product.id },
            data: {
                unitWeightKg: unitWeight.toString(),
                unitVolumeM3: unitVolume.toString(),
            },
        })
        updates.push({ sku, qty, unitWeight, unitVolume })
        totals.updated++
    }

    console.log("---- updated ----")
    for (const u of updates) {
        console.log(
            `${u.sku.padEnd(12)} qty=${String(u.qty).padStart(4)}  ` +
                `вес/шт=${u.unitWeight} кг   объём/шт=${u.unitVolume} м³`,
        )
    }
    if (missing.length) {
        console.log("---- not in DB ----")
        for (const sku of missing) console.log(sku)
    }
    if (noQty.length) {
        console.log("---- transportPackQty=0, skipped ----")
        for (const sku of noQty) console.log(sku)
    }
    console.log(`\nDone. matched=${totals.matched}, updated=${totals.updated}`)
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(() => prisma.$disconnect())
