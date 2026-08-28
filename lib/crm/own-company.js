import prisma from "@/lib/client"
import { getSettings, setSetting } from "./settings"

// «Наши компании» — собственные юрлица, от имени которых мы продаём. Это
// обычные карточки контрагентов (как правило, дистрибьюторы): они остаются в
// своём списке со всей историей, флаг лишь помечает их как свои. Отмечает их
// администратор в /crm/settings.
//
// Компания по умолчанию хранится не флагом на карточке, а одним ключом
// настроек: «основная» одна на всю CRM, и держать инвариант одним значением
// проще, чем следить за уникальностью флага среди карточек.

export const DEFAULT_OWN_COMPANY_KEY = "defaultOwnCompanyId"

export const OWN_COMPANY_SELECT = {
    id: true,
    name: true,
    type: true,
    inn: true,
    kpp: true,
    region: true,
    isOwnCompany: true,
}

/**
 * Наши юрлица списком + id основного.
 *
 * Настройка может указывать на карточку, с которой флаг уже сняли (или её
 * удалили) — такой id мы не возвращаем, иначе автоподстановка молча тянула бы
 * чужое юрлицо.
 */
export async function getOwnCompanies() {
    const items = await prisma.counterparty.findMany({
        where: { isOwnCompany: true },
        orderBy: { name: "asc" },
        select: OWN_COMPANY_SELECT,
    })

    const map = await getSettings([DEFAULT_OWN_COMPANY_KEY])
    const stored = map[DEFAULT_OWN_COMPANY_KEY] || null
    const defaultId = stored && items.some(i => i.id === stored) ? stored : null

    return {
        items: items.map(i => ({ ...i, isDefault: i.id === defaultId })),
        defaultId,
    }
}

/** Компания по умолчанию — то, что подставится в сделку, если не выбрали другую. */
export async function getDefaultOwnCompany() {
    const { items, defaultId } = await getOwnCompanies()
    if (!defaultId) return null
    return items.find(i => i.id === defaultId) || null
}

export async function setDefaultOwnCompanyId(id) {
    await setSetting(DEFAULT_OWN_COMPANY_KEY, id || "")
}
