// Подстановка {{placeholder}} → значение. Чистая функция без серверных
// зависимостей — используется и на сервере, и в клиентских компонентах.
export function fillTemplate(template, vars) {
    return String(template).replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_, name) => {
        const v = vars[name]
        return v === null || v === undefined ? "" : String(v)
    })
}
