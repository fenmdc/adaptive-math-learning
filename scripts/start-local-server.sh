#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/Users/fenmdc/Documents/Codex/2026-06-05/github-adaptive-math-learning/work/adaptive-math-learning"
PORT="${ADAPTIVE_MATH_PORT:-3017}"
NODE_BIN="${ADAPTIVE_MATH_NODE:-}"
NPM_BIN="${ADAPTIVE_MATH_NPM:-}"
NEXT_BIN="${APP_DIR}/node_modules/next/dist/bin/next"

find_node() {
  if [[ -n "${NODE_BIN}" && -x "${NODE_BIN}" ]]; then
    printf "%s" "${NODE_BIN}"
    return 0
  fi

  for candidate in \
    /opt/homebrew/bin/node \
    /usr/local/bin/node \
    "${HOME}/.nvm/versions/node"/*/bin/node \
    "${HOME}/.volta/bin/node" \
    "${HOME}/.asdf/shims/node"; do
    if [[ -x "${candidate}" ]]; then
      printf "%s" "${candidate}"
      return 0
    fi
  done

  if command -v node >/dev/null 2>&1; then
    command -v node
    return 0
  fi

  return 1
}

find_npm() {
  if [[ -n "${NPM_BIN}" && -x "${NPM_BIN}" ]]; then
    printf "%s" "${NPM_BIN}"
    return 0
  fi

  for candidate in \
    /opt/homebrew/bin/npm \
    /usr/local/bin/npm \
    "${HOME}/.nvm/versions/node"/*/bin/npm \
    "${HOME}/.volta/bin/npm" \
    "${HOME}/.asdf/shims/npm"; do
    if [[ -x "${candidate}" ]]; then
      printf "%s" "${candidate}"
      return 0
    fi
  done

  if command -v npm >/dev/null 2>&1; then
    command -v npm
    return 0
  fi

  return 1
}

cd "${APP_DIR}"

node_path="$(find_node)"
npm_path="$(find_npm || true)"

if [[ ! -x "${NEXT_BIN}" ]]; then
  if [[ -z "${npm_path}" ]]; then
    echo "npm not found and ${NEXT_BIN} is missing." >&2
    exit 127
  fi
  "${npm_path}" install
fi

if [[ ! -x "${NEXT_BIN}" ]]; then
  echo "Next.js CLI not found at ${NEXT_BIN}." >&2
  exit 127
fi

echo "[$(/bin/date)] Adaptive Math Learning server starting"
echo "App directory: ${APP_DIR}"
echo "Port: ${PORT}"
echo "node: ${node_path}"
[[ -n "${npm_path}" ]] && echo "npm: ${npm_path}"
echo "next: ${NEXT_BIN}"

exec "${node_path}" "${NEXT_BIN}" dev apps/web --port "${PORT}"
