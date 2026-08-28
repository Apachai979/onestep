#!/usr/bin/env bash
# Ночное обновление закупок из Tenderland: забирает новые и сверяет те, что уже
# в работе. Тот же сценарий, что у кнопки «Обновить закупки» в /crm/tenders.
#
# Ставится в системный cron, а не в PM2: приложению нужен один инстанс, и
# плодить второй процесс ради одного HTTP-запроса в сутки незачем.
#
#   crontab -e
#   0 6 * * * /var/www/onestep/scripts/tenders-cron.sh >> /var/log/onestep-tenders.log 2>&1
#
# Запуск в 06:00 МСК: к началу рабочего дня свежие закупки уже в списке, а
# суточные лимиты Тендерлэнда сбрасываются в полночь по Москве, так что весь
# дневной запас ещё цел.
set -euo pipefail

ENV_FILE="${ENV_FILE:-/var/www/onestep/.env}"
BASE_URL="${CRM_BASE_URL:-http://127.0.0.1:3000}"

if [ ! -f "$ENV_FILE" ]; then
    echo "$(date -Is) нет файла окружения $ENV_FILE" >&2
    exit 1
fi

# Читаем только нужный ключ: подключать весь .env через source опасно, там
# значения с пробелами и кавычками.
SECRET="$(grep -E '^TENDERS_CRON_SECRET=' "$ENV_FILE" | head -n1 | cut -d= -f2-)"
if [ -z "$SECRET" ]; then
    echo "$(date -Is) TENDERS_CRON_SECRET не задан — роут не пустит" >&2
    exit 1
fi

# Сверка отслеживаемых закупок ходит в Тендерлэнд по одной пачке за раз и на
# полусотне закупок укладывается в пару минут; таймаут с запасом.
RESPONSE="$(curl -sS --max-time 600 -o - -w '\n%{http_code}' \
    -X POST "$BASE_URL/api/crm/tenders/sync" \
    -H "x-cron-secret: $SECRET" \
    -H 'Content-Type: application/json' \
    -d '{}')"

CODE="$(printf '%s' "$RESPONSE" | tail -n1)"
BODY="$(printf '%s' "$RESPONSE" | sed '$d')"

echo "$(date -Is) HTTP $CODE $BODY"
[ "$CODE" = "200" ]
