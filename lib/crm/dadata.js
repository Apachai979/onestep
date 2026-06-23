const FIND_BY_ID_URL = "https://suggestions.dadata.ru/suggestions/api/4_1/rs/findById/party"
const SUGGEST_URL = "https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/party"

const DIGITS_RE = /^\d+$/

export function detectQueryKind(query) {
    const q = String(query || "").trim()
    if (!q) return null
    if (DIGITS_RE.test(q) && [10, 12, 13, 15].includes(q.length)) return "findById"
    return "suggest"
}

export async function searchParty(query, { token, count = 5 } = {}) {
    if (!token) throw new Error("DADATA_API_KEY не задан")
    const kind = detectQueryKind(query)
    if (!kind) return []

    const url = kind === "findById" ? FIND_BY_ID_URL : SUGGEST_URL
    const body =
        kind === "findById"
            ? { query: query.trim() }
            : { query: query.trim(), count }

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
    const suggestions = Array.isArray(payload.suggestions) ? payload.suggestions : []
    return suggestions.map(normalize)
}

function normalize(s) {
    const d = s?.data || {}
    const addr = d.address || {}
    const addrData = addr.data || {}

    const stateStatus = d.state?.status || null
    const branchType = d.branch_type || null

    return {
        name: d.name?.short_with_opf || d.name?.full_with_opf || s.value || "",
        fullName: d.name?.full_with_opf || s.unrestricted_value || s.value || "",
        inn: d.inn || "",
        kpp: d.kpp || "",
        ogrn: d.ogrn || "",
        okpo: d.okpo || "",
        okved: d.okved || "",
        region: addrData.region_with_type || addrData.region || "",
        address: addr.unrestricted_value || addr.value || "",
        type: d.type || null,
        state: stateStatus,
        branchType,
    }
}
