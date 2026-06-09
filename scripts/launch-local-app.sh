#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/Users/fenmdc/Documents/Codex/2026-06-05/github-adaptive-math-learning/work/adaptive-math-learning"
PORT="${ADAPTIVE_MATH_PORT:-3017}"
URL="http://localhost:${PORT}"
LOG_DIR="${HOME}/Library/Logs/Adaptive Math Learning"
LOG_FILE="${LOG_DIR}/dev-server.log"
PID_FILE="${LOG_DIR}/dev-server.pid"

mkdir -p "${LOG_DIR}"

is_ready() {
  /usr/bin/curl -fsS "${URL}" >/dev/null 2>&1
}

start_server() {
  cd "${APP_DIR}"
  nohup /usr/bin/env npm run dev >"${LOG_FILE}" 2>&1 &
  echo "$!" > "${PID_FILE}"
}

if ! is_ready; then
  if [[ -f "${PID_FILE}" ]]; then
    pid="$(cat "${PID_FILE}")"
    if [[ -n "${pid}" ]] && kill -0 "${pid}" >/dev/null 2>&1; then
      :
    else
      start_server
    fi
  else
    start_server
  fi

  for _ in {1..40}; do
    if is_ready; then
      break
    fi
    /bin/sleep 0.5
  done
fi

/usr/bin/open "${URL}"
