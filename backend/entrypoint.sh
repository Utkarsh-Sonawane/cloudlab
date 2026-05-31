#!/bin/sh
# =============================================================================
# CloudLab Backend — Docker Entrypoint
# =============================================================================

set -e

echo "⏳ Waiting for PostgreSQL..."
while ! nc -z "$DB_HOST" "${DB_PORT:-5432}"; do
  sleep 0.5
done
echo "✅ PostgreSQL is ready."

echo "⏳ Waiting for Redis..."
while ! nc -z "$REDIS_HOST" "${REDIS_PORT:-6379}"; do
  sleep 0.5
done
echo "✅ Redis is ready."

echo "🔄 Running migrations..."
python manage.py migrate --noinput

echo "📦 Collecting static files..."
python manage.py collectstatic --noinput --clear

echo "🚀 Starting server..."
exec "$@"
