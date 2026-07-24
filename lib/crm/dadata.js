const DIGITS_RE = /^\d+$/

const URLS = {
    party: {
        findById: "https://suggestions.dadata.ru/suggestions/api/4_1/rs/findById/party",
        suggest: "https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/party",
    },
    bank: {
        findById: "https://suggestions.dadata.ru/suggestions/api/4_1/rs/findById/bank",
        suggest: "https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/bank",
    },
}

export function detectPartyKind(query) {
    const q = String(query || "").trim()
    if (!q) return null
    if (DIGITS_RE.test(q) && [10, 12, 13, 15].includes(q.length)) return "findById"
    return "suggest"
}

export function detectBankKind(query) {
    const q = String(query || "").trim()
    if (!q) return null
    if (DIGITS_RE.test(q) && q.length === 9) return "findById"
    return "suggest"
}

async function callDadata({ url, body, token }) {
    const res = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Token ${token}`,
        },
        body: JSON.stringify(body),
    })
    if (!res.ok) {
        const text = await res.text().catch(() => "")
        throw new Error(`DaData ${res.status}: ${text || res.statusText}`)
    }
    const payload = await res.json()
    return Array.isArray(payload.suggestions) ? payload.suggestions : []
}

export async function searchParty(query, { token, count = 5 } = {}) {
    if (!token) throw new Error("DADATA_API_KEY не задан")
    const kind = detectPartyKind(query)
    if (!kind) return []
    const url = URLS.party[kind]
    const body = kind === "findById" ? { query: query.trim() } : { query: query.trim(), count }
    const suggestions = await callDadata({ url, body, token })
    return suggestions.map(normalizeParty)
}

export async function searchBank(query, { token, count = 5 } = {}) {
    if (!token) throw new Error("DADATA_API_KEY не задан")
    const kind = detectBankKind(query)
    if (!kind) return []
    const url = URLS.bank[kind]
    const body = kind === "findById" ? { query: query.trim() } : { query: query.trim(), count }
    const suggestions = await callDadata({ url, body, token })
    return suggestions.map(normalizeBank)
}

function firstContact(arr) {
    if (!Array.isArray(arr) || arr.length === 0) return ""
    const item = arr[0]
    if (!item) return ""
    if (typeof item === "string") return item
    return item.value || item.unrestricted_value || ""
}

function normalizeParty(s) {
    const d = s?.data || {}
    const addr = d.address || {}
    const addrData = addr.data || {}

    return {
        name: d.name?.short_with_opf || d.name?.full_with_opf || s.value || "",
        fullName: d.name?.full_with_opf || s.unrestricted_value || s.value || "",
        inn: d.inn || "",
        kpp: d.kpp || "",
        ogrn: d.ogrn || "",
        okpo: d.okpo || "",
        okved: d.okved || "",
        region: addrData.region_with_type || addrData.region || "",
        city:
            addrData.city_with_type ||
            addrData.city ||
            addrData.settlement_with_type ||
            addrData.settlement ||
            "",
        address: addr.unrestricted_value || addr.value || "",
        phone: firstContact(d.phones),
        email: firstContact(d.emails),
        opfCode: d.opf?.code || "",
        opfShort: d.opf?.short || "",
        type: d.type || null,
        state: d.state?.status || null,
        branchType: d.branch_type || null,
    }
}

function normalizeBank(s) {
    const d = s?.data || {}
    const addr = d.address || {}

    return {
        name: d.name?.payment || d.name?.short || s.value || "",
        bik: d.bic || "",
        bankCorrAccount: d.correspondent_account || "",
        swift: d.swift || "",
        address: addr.unrestricted_value || addr.value || "",
        state: d.state?.status || null,
    }
}
