#!/bin/sh
set -e

# Миграции при каждом старте контейнера (Docker / docker compose up).
# Отключить: RUN_MIGRATIONS=0 в environment сервиса backend.
if [ "${RUN_MIGRATIONS:-1}" != "0" ] && [ "${RUN_MIGRATIONS:-1}" != "false" ]; then
  MIGRATION_MAX_RETRIES="${MIGRATION_MAX_RETRIES:-20}"
  MIGRATION_RETRY_DELAY_SEC="${MIGRATION_RETRY_DELAY_SEC:-5}"
  attempt=1
  migrated=0

  echo "[docker-entrypoint] Running Sequelize migrations (env: ${NODE_ENV:-production})..."
  while [ "$attempt" -le "$MIGRATION_MAX_RETRIES" ]; do
    if npx sequelize-cli db:migrate --env "${NODE_ENV:-production}"; then
      migrated=1
      echo "[docker-entrypoint] Migrations finished."
      break
    fi

    echo "[docker-entrypoint] Migration attempt ${attempt}/${MIGRATION_MAX_RETRIES} failed."
    if [ "$attempt" -lt "$MIGRATION_MAX_RETRIES" ]; then
      echo "[docker-entrypoint] Waiting ${MIGRATION_RETRY_DELAY_SEC}s before retry..."
      sleep "$MIGRATION_RETRY_DELAY_SEC"
    fi
    attempt=$((attempt + 1))
  done

  if [ "$migrated" -ne 1 ]; then
    echo "[docker-entrypoint] Migration failed after ${MIGRATION_MAX_RETRIES} attempts."
    exit 1
  fi
else
  echo "[docker-entrypoint] Skipping migrations (RUN_MIGRATIONS=${RUN_MIGRATIONS})."
fi

exec "$@"
