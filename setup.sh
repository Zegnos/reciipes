#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

echo "Setup script for reciipes — starting"

copy_env() {
  if [ -f "$1/.env.example" ] && [ ! -f "$1/.env" ]; then
    cp "$1/.env.example" "$1/.env"
    echo "- Created $1/.env from example"
  else
    echo "- $1/.env already exists or example missing"
  fi
}

copy_env api
copy_env frontend

DB_HOST=""
DB_PORT=""
DB_USER=""
DB_PASSWORD=""
DB_NAME=""
if [ -f api/.env ]; then
  DB_HOST=$(grep -m1 '^DB_HOST=' api/.env | cut -d'=' -f2- | tr -d '"' || true)
  DB_PORT=$(grep -m1 '^DB_PORT=' api/.env | cut -d'=' -f2- | tr -d '"' || true)
  DB_USER=$(grep -m1 '^DB_USER=' api/.env | cut -d'=' -f2- | tr -d '"' || true)
  DB_PASSWORD=$(grep -m1 '^DB_PASSWORD=' api/.env | cut -d'=' -f2- | tr -d '"' || true)
  DB_NAME=$(grep -m1 '^DB_NAME=' api/.env | cut -d'=' -f2- | tr -d '"' || true)
fi

run_db_setup_if_needed() {
  SQL_FILE="$ROOT_DIR/api/database/db_setup.sql"
  if [ ! -f "$SQL_FILE" ]; then
    echo "No database setup SQL found at $SQL_FILE"
    return 0
  fi

  if [ -z "$DB_HOST" ] || [ -z "$DB_USER" ] || [ -z "$DB_PASSWORD" ] || [ -z "$DB_NAME" ]; then
    echo "DB credentials incomplete in api/.env; skipping automatic remote DB initialization"
    return 0
  fi
  echo "Checking database '$DB_NAME' on host '$DB_HOST' before applying initialization..."

  NETWORK_ARGS=""
  if [[ "$DB_HOST" == "127.0.0.1" || "$DB_HOST" == "localhost" ]]; then
    NETWORK_ARGS="--network host"
  fi

  check_with_local_mysql() {
    if command -v mysql >/dev/null 2>&1; then
      mysql -sN -h "$DB_HOST" -P "${DB_PORT:-3306}" -u "$DB_USER" -p"$DB_PASSWORD" -e \
        "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = '$DB_NAME';" 2>/dev/null || true
    else
      echo ""
    fi
  }

  check_with_docker_mysql() {
    if command -v docker >/dev/null 2>&1; then
      docker run --rm $NETWORK_ARGS mysql:8.0 sh -c \
        "exec mysql -sN -h \"$DB_HOST\" -P ${DB_PORT:-3306} -u \"$DB_USER\" -p\"$DB_PASSWORD\" -e \"SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = '$DB_NAME';\"" 2>/dev/null || true
    else
      echo ""
    fi
  }

  TABLE_COUNT=""
  TABLE_COUNT=$(check_with_local_mysql)
  if [ -z "${TABLE_COUNT:-}" ]; then
    TABLE_COUNT=$(check_with_docker_mysql)
  fi

  if [ -n "${TABLE_COUNT:-}" ]; then

    TABLE_COUNT=$(echo "$TABLE_COUNT" | tr -d '\r' | tr -d '\n' || true)
    if [ -z "$TABLE_COUNT" ]; then TABLE_COUNT=0; fi
    if [ "$TABLE_COUNT" -gt 0 ] 2>/dev/null; then
      echo "Database '$DB_NAME' already contains $TABLE_COUNT table(s). Skipping schema initialization to avoid data loss."
      return 0
    else
      echo "Database appears empty (0 tables). Will apply initialization SQL."
    fi
  else

    echo "Could not determine whether database '$DB_NAME' already contains tables (no mysql client and no docker access)."
    read -r -p "Impossible de vérifier si la BDD est vide. Voulez-vous forcer l'initialisation (peut écraser des données) ? [y/N] " force_answer
    case "$force_answer" in
      [Yy]|[Yy][Ee][Ss])
        echo "Forcing DB initialization as requested by user." ;;
      *)
        echo "Initialization skipped. Please run $SQL_FILE manually if you need to initialize the schema." ; return 0 ;;
    esac
  fi

  echo "Applying SQL from $SQL_FILE..."

  # Try local mysql client to apply SQL
  if command -v mysql >/dev/null 2>&1; then
    if mysql -h "$DB_HOST" -P "${DB_PORT:-3306}" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < "$SQL_FILE"; then
      echo "Database initialized successfully with local mysql client"
      return 0
    else
      echo "Local mysql client failed to apply SQL (will try dockerized client)"
    fi
  fi

  if command -v docker >/dev/null 2>&1; then
    if docker run --rm $NETWORK_ARGS -v "$SQL_FILE":/tmp/db_setup.sql:ro mysql:8.0 sh -c \
      "exec mysql -h \"$DB_HOST\" -P ${DB_PORT:-3306} -u \"$DB_USER\" -p\"$DB_PASSWORD\" \"$DB_NAME\" < /tmp/db_setup.sql"; then
      echo "Database initialized successfully with dockerized mysql client"
      return 0
    else
      echo "Dockerized mysql client failed to initialize database"
      return 1
    fi
  fi

  echo "No available mysql client (local or docker). Cannot initialize remote DB automatically. Please run the SQL manually:"
  echo "  mysql -h $DB_HOST -P ${DB_PORT:-3306} -u $DB_USER -p<password> $DB_NAME < $SQL_FILE"
  return 1
}

wait_for_http() {
  local url=$1
  local timeout=${2:-120}
  local start=$(date +%s)
  while true; do
    if curl -s -I "$url" >/dev/null 2>&1; then
      echo "$url is reachable"
      return 0
    fi
    sleep 2
    now=$(date +%s)
    if [ $((now - start)) -ge $timeout ]; then
      echo "Timed out waiting for $url"
      return 1
    fi
  done
}

if command -v docker >/dev/null 2>&1; then
  echo "Docker found — starting services with docker compose (detached)"

  if [ -f api/.env ]; then
    echo "Loading variables from api/.env into environment (temporary for docker-compose)"

    while IFS='=' read -r key val; do

      case "$key" in
        ''|\#*) continue ;;
      esac

      key=$(echo "$key" | tr -d '[:space:]')
      val=$(echo "$val" | sed -e 's/^\s*"//' -e 's/"\s*$//' -e "s/^\s*'//" -e "s/'\s*$//")

      export "$key"="$val"
    done < <(grep -E '^[A-Za-z_][A-Za-z0-9_]*=' api/.env || true)


    : "${MYSQL_ROOT_PASSWORD:=rootpassword}"
    export MYSQL_ROOT_PASSWORD


    : "${DB_NAME:=reciipe_v2}"
    : "${DB_USER:=reciipes}"
    : "${DB_PASSWORD:=reciipe_password}"
    : "${DB_HOST:=db}"
    export DB_NAME DB_USER DB_PASSWORD DB_HOST

    echo "- Variables exported from api/.env"
  else
    echo "api/.env not found — exporting minimal DB variables from parsed values"
    export MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD:-rootpassword}
    export DB_NAME=${DB_NAME:-reciipe_v2}
    export DB_USER=${DB_USER:-reciipes}
    export DB_PASSWORD=${DB_PASSWORD:-reciipe_password}
    export DB_HOST=${DB_HOST:-db}
  fi

  docker compose pull || true
  docker compose up --build -d

  echo "Waiting for frontend (http://localhost:3014) and api (http://localhost:2029) to respond..."
  wait_for_http http://localhost:3014 || true
  wait_for_http http://localhost:2029 || true
  echo "Services started. Frontend: http://localhost:3014 | API: http://localhost:2029"

  if [ -n "$DB_HOST" ] && [ "$DB_HOST" != "db" ]; then
    echo "Remote DB detected: host=$DB_HOST db=$DB_NAME user=$DB_USER"
    read -r -p "Do you want to run the SQL initialization script on this database? [y/N] " answer
    case "$answer" in
      [Yy]|[Yy][Ee][Ss])
        run_db_setup_if_needed || echo "Warning: automatic DB init failed; see INSTALL.md for manual steps."
        ;;
      *)
        echo "Database initialization cancelled by user. No changes made." ;;
    esac
  fi

  echo "To follow logs: Do logs !"
  exit 0
else
  echo "Docker not found. Falling back to local install using npm workspaces."
  if ! command -v npm >/dev/null 2>&1; then
    echo "ERROR: npm is not installed. Install Node.js (>=18) and retry, or install Docker." >&2
    exit 2
  fi

  echo "Installing dependencies for all workspaces (this may take a while)..."
  npm run install:all

  echo "Launching dev servers (api + frontend) in background using npm run dev"

  npm run dev &
  DEV_PID=$!

  echo "Waiting for services to become available..."
  wait_for_http http://localhost:5173 30 || true
  wait_for_http http://localhost:2029 30 || true

  echo "Dev servers started. Frontend (Vite dev server): http://localhost:5173 | API: http://localhost:2029"
  echo "To stop dev servers: kill $DEV_PID"
  exit 0
fi
