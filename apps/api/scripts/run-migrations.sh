#!/usr/bin/env bash
# Ejecuta todos los .sql de src/db/migrations en orden lexicográfico (timestamp en el nombre).
#
# Uso (desde apps/api):
#   DATABASE_URL='postgresql://...' ./scripts/run-migrations.sh
#
# Railway: la URL con host *.railway.internal solo funciona dentro de Railway (shell del servicio,
# `railway run`, o un deploy). Desde tu máquina usá la DATABASE_URL pública del plugin Postgres
# (proxy / puerto expuesto) que muestra el dashboard.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIG_DIR="$ROOT/src/db/migrations"

if [[ -z "${DATABASE_URL:-}" ]]; then
    echo 'Error: definí DATABASE_URL (ej. export DATABASE_URL=...)' >&2
    exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
    for d in /opt/homebrew/opt/libpq/bin /usr/local/opt/libpq/bin; do
        if [[ -x "$d/psql" ]]; then
            PATH="$d:$PATH"
            break
        fi
    done
fi
if ! command -v psql >/dev/null 2>&1; then
    echo 'Error: falta psql. En macOS: brew install libpq && brew link --force libpq' >&2
    exit 1
fi

if [[ ! -d "$MIG_DIR" ]]; then
    echo "Error: no existe $MIG_DIR" >&2
    exit 1
fi

count=0
while IFS= read -r file; do
    [[ -n "$file" ]] || continue
    echo "==> $(basename "$file")"
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$file"
    count=$((count + 1))
done < <(find "$MIG_DIR" -maxdepth 1 -name '*.sql' -type f | sort)

if [[ "$count" -eq 0 ]]; then
    echo "Error: no hay archivos .sql en $MIG_DIR" >&2
    exit 1
fi

echo "Listo: $count migración(es) aplicada(s)."
