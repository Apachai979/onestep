// Личные настройки сотрудника (User.prefs). SQLite не умеет Json, поэтому в
// базе лежит JSON-строка, а по коду ходит обычный объект.
//
// Значения по умолчанию — «включено»: менеджер, которому поставили задачу,
// должен узнать о ней, даже если ни разу не заходил в профиль.

export const DEFAULT_PREFS = {
    // Письмо исполнителю о новой (или переданной ему) задаче.
    taskEmail: true,
}

export const PREF_KEYS = Object.keys(DEFAULT_PREFS)

export function parsePrefs(raw) {
    const out = { ...DEFAULT_PREFS }
    if (!raw) return out
    let parsed
    try {
        parsed = JSON.parse(raw)
    } catch {
        // Битую строку молча игнорируем — настройки не та вещь, ради которой
        // стоит ронять карточку профиля.
        return out
    }
    if (!parsed || typeof parsed !== "object") return out
    for (const k of PREF_KEYS) {
        if (typeof parsed[k] === "boolean") out[k] = parsed[k]
    }
    return out
}

export function serializePrefs(prefs) {
    return JSON.stringify(prefs)
}

/**
 * Настройки для записи в базу: форма профиля присылает только то, что менялось,
 * остальное берём из текущего значения.
 */
export function mergePrefsPayload(raw, patch) {
    if (!patch || typeof patch !== "object") return { error: "Некорректные настройки" }
    const next = parsePrefs(raw)
    for (const k of PREF_KEYS) {
        if (patch[k] === undefined) continue
        if (typeof patch[k] !== "boolean") {
            return { error: `Настройка ${k} должна быть true или false` }
        }
        next[k] = patch[k]
    }
    return { value: serializePrefs(next) }
}

export function wantsTaskEmail(user) {
    return parsePrefs(user?.prefs).taskEmail
}
