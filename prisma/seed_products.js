const fs = require("fs")
const path = require("path")
const { PrismaClient } = require("@prisma/client")

const prisma = new PrismaClient()

const CATEGORY_BY_PREFIX = [
    [/^NS-001/, "Набор NeoSet для снятия швов"],
    [/^NS-002/, "Набор NeoSet для обработки ран"],
    [/^NS-003/, "Набор NeoSet для забора донорской крови"],
    [/^NS-004/, "Набор NeoSet для забора крови из вены"],
    [/^NS-005/, "Набор NeoSet для катетеризации мочевого пузыря"],
    [/^NS-006/, "Набор NeoSet для катетеризации центральных вен"],
    [/^NS-007/, "Набор NeoSet для локальной анестезии"],
    [/^NS-008/, "Набор NeoSet для эпидуральной анестезии"],
    [/^SL-35/, "Тампоны марлевые"],
]

function categoryBySku(sku) {
    for (const [re, name] of CATEGORY_BY_PREFIX) {
        if (re.test(sku)) return name
    }
    return null
}

function buildSkuIndex(catalog) {
    const idx = new Map()
    for (const set of catalog) {
        const groups = [set.in_the_beginning, set.in_the_end].filter(Boolean)
        for (const g of groups) {
            for (const comp of g.compositions || []) {
                const m = (comp.tagname || "").match(/[A-Z]{2,}-\d+(?:-\d+)*/)
                if (!m) continue
                idx.set(m[0], { setName: set.runame, components: comp.components || [] })
            }
        }
    }
    return idx
}

function formatContent(components) {
    return components
        .filter(c => c.amount && c.amount !== "-" && c.amount.trim() !== "")
        .map(c => `${c.components_name_ru} — ${c.amount} шт.`)
        .join("\n")
}

async function main() {
    const productsFile = path.join(__dirname, "products_seed.json")
    const catalogFile = path.join(__dirname, "..", "components", "Data", "data.json")

    const rows = JSON.parse(fs.readFileSync(productsFile, "utf8"))
    const catalog = JSON.parse(fs.readFileSync(catalogFile, "utf8"))
    const skuIndex = buildSkuIndex(catalog)

    let created = 0
    let updated = 0
    const missing = []

    for (const row of rows) {
        const sku = (row.sku || "").trim()
        if (!sku) continue

        const match = skuIndex.get(sku)
        const fallbackCategory = categoryBySku(sku)
        if (!match) missing.push(sku)

        const category = match?.setName ?? fallbackCategory ?? "Без категории"
        const contents = match ? formatContent(match.components) : null

        const data = {
            sku,
            name: category,
            category,
            basePrice: String(row.base_price_rub ?? 0),
            packagePrice: String(row.package_price_rub ?? 0),
            recommendedLpuPrice:
                row.recommended_lpu_price_rub === null ||
                row.recommended_lpu_price_rub === undefined
                    ? null
                    : String(row.recommended_lpu_price_rub),
            transportPackQty: Number.isFinite(row.transport_pack_qty)
                ? row.transport_pack_qty
                : 0,
            contents,
        }

        const existed = await prisma.product.findUnique({ where: { sku } })
        await prisma.product.upsert({ where: { sku }, create: data, update: data })
        if (existed) updated++
        else created++
    }

    console.log(`[seed:products] created: ${created}, updated: ${updated}`)
    if (missing.length) {
        console.log(`[seed:products] no match in data.json (kept as "Без категории"):`)
        for (const sku of missing) console.log(`  - ${sku}`)
    }
}

main()
    .catch(err => {
        console.error(err)
        process.exit(1)
    })
    .finally(() => prisma.$disconnect())
