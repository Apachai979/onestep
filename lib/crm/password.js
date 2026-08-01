// Единые правила пароля: регистрация по приглашению, смена пароля в профиле
// и сброс пароля админом должны требовать одного и того же.

export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_HINT = `Минимум ${PASSWORD_MIN_LENGTH} символов`

export function validatePassword(raw) {
    if (typeof raw !== "string" || raw.length < PASSWORD_MIN_LENGTH) {
        return {
            error: `Пароль должен содержать минимум ${PASSWORD_MIN_LENGTH} символов`,
        }
    }
    return { value: raw }
}
