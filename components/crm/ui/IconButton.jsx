import Button from "./Button"

// Квадратная иконочная кнопка. Обязателен `aria-label` для доступности.
export default function IconButton({
    variant = "ghost",
    size = "md",
    "aria-label": ariaLabel,
    title,
    children,
    ...rest
}) {
    return (
        <Button
            variant={variant}
            size={size}
            iconOnly
            aria-label={ariaLabel || title}
            title={title}
            {...rest}
        >
            {children}
        </Button>
    )
}
