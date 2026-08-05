#!/usr/bin/env bash
# Забрать актуальную боевую базу (и, по флагу, вложения) с прода в локальный проект.
#
#   bash scripts/pull-prod-db.sh                 # только база
#   bash scripts/pull-prod-db.sh --with-uploads  # база + папка uploads
#   SERVER=root@1.2.3.4 bash scripts/pull-prod-db.sh
#
# Текущая локальная база сохраняется в prisma/dev.db.bak-local-<время> — откатиться
# можно, просто скопировав этот файл обратно в prisma/dev.db.

set -euo pipefail

SERVER="${SERVER:-root@83.217.202.170}"
REMOTE_DIR="${REMOTE_DIR:-/var/www/onestep}"

# Скрипт запускается ТОЛЬКО с локальной машины — он сам ходит на прод по SSH.
# Запуск на сервере подменил бы боевую базу её же снимком и снёс журнал у живой базы.
if [ -d "$REMOTE_DIR" ]; then
  echo "ОТКАЗ: похоже, это сам сервер ($REMOTE_DIR существует локально)." >&2
  echo "Скрипт нужно запускать со своей машины — он подключится сюда сам." >&2
  exit 1
fi

cd "$(dirname "$0")/.."
STAMP="$(date +%Y%m%d-%H%M%S)"
REMOTE_SNAPSHOT="/tmp/onestep-pull-${STAMP}.db"

echo "==> Снимаю консистентный снимок базы на $SERVER"
# sqlite3 .backup, а не cp: приложение под PM2 пишет в базу, WAL надо слить корректно
ssh "$SERVER" "sqlite3 '$REMOTE_DIR/prisma/dev.db' \".backup '$REMOTE_SNAPSHOT'\""

echo "==> Качаю снимок"
scp "$SERVER:$REMOTE_SNAPSHOT" "prisma/dev.db.prod-${STAMP}"
ssh "$SERVER" "rm -f '$REMOTE_SNAPSHOT'"

if [ -f prisma/dev.db ]; then
  echo "==> Прячу текущую локальную базу в prisma/dev.db.bak-local-${STAMP}"
  cp prisma/dev.db "prisma/dev.db.bak-local-${STAMP}"
fi

echo "==> Подменяю prisma/dev.db"
mv "prisma/dev.db.prod-${STAMP}" prisma/dev.db
# хвосты старого WAL от локальной базы принадлежат уже несуществующему файлу
rm -f prisma/dev.db-wal prisma/dev.db-shm prisma/dev.db-journal

if [ "${1:-}" = "--with-uploads" ]; then
  echo "==> Синхронизирую вложения"
  mkdir -p uploads
  rsync -az --delete "$SERVER:$REMOTE_DIR/uploads/" uploads/
fi

echo "==> Проверяю миграции"
npx prisma migrate status || true

echo
echo "Готово. Локальная база = прод на $STAMP."
