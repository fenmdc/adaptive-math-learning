#!/usr/bin/env bash
set -u

APP_DIR="/Users/fenmdc/Documents/Codex/2026-06-05/github-adaptive-math-learning/work/adaptive-math-learning"
PORT="${ADAPTIVE_MATH_PORT:-3017}"
URL="http://localhost:${PORT}"
LOG_DIR="${HOME}/Library/Logs/Adaptive Math Learning"
LOG_FILE="${LOG_DIR}/dev-server.log"
PID_FILE="${LOG_DIR}/dev-server.pid"
SERVER_SCRIPT="${APP_DIR}/scripts/start-local-server.sh"

mkdir -p "${LOG_DIR}"

is_ready() {
  /usr/bin/curl -fsS "${URL}" >/dev/null 2>&1
}

port_is_taken() {
  /usr/sbin/lsof -nP -iTCP:"${PORT}" -sTCP:LISTEN >/dev/null 2>&1
}

show_error() {
  local message="$1"
  /usr/bin/osascript - "$message" <<'APPLESCRIPT' >/dev/null 2>&1 || true
on run argv
  display dialog (item 1 of argv) buttons {"OK"} default button "OK" with title "Adaptive Math Learning"
end run
APPLESCRIPT
}

start_server() {
  chmod +x "${SERVER_SCRIPT}" >/dev/null 2>&1 || true
  {
    echo "[$(/bin/date)] Launcher starting server"
    echo "URL: ${URL}"
    echo "Script: ${SERVER_SCRIPT}"
  } > "${LOG_FILE}"
  nohup "${SERVER_SCRIPT}" </dev/null >>"${LOG_FILE}" 2>&1 &
  echo "$!" > "${PID_FILE}"
}

if ! is_ready; then
  if port_is_taken; then
    show_error "Port ${PORT} is in use, but ${URL} is not responding. See ${LOG_FILE}"
    exit 1
  fi

  start_server

  for _ in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 32 33 34 35 36 37 38 39 40; do
    if is_ready; then
      break
    fi
    /bin/sleep 0.5
  done
fi

if ! is_ready; then
  show_error "Adaptive Math Learning did not become ready at ${URL}. See ${LOG_FILE}"
  exit 1
fi

/usr/bin/open "${URL}"
