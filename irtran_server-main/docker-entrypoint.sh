#!/bin/sh
set -e

# Миграции при каждом старте контейнера (Docker / docker compose up).
# Отключить: RUN_MIGRATIONS=0 в environment сервиса backend.
if [ "${RUN_MIGRATIONS:-1}" != "0" ] && [ "${RUN_MIGRATIONS:-1}" != "false" ]; then
  echo "[docker-entrypoint] Running Sequelize migrations (env: ${NODE_ENV:-production})..."
  npx sequelize-cli db:migrate --env "${NODE_ENV:-production}" || {
    echo "[docker-entrypoint] Migration failed. If MySQL only just became ready, restart the backend container once."
    exit 1
  }
  echo "[docker-entrypoint] Migrations finished."
else
  echo "[docker-entrypoint] Skipping migrations (RUN_MIGRATIONS=${RUN_MIGRATIONS})."
fi

exec "$@"
