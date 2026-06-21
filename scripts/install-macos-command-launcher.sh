#!/usr/bin/env bash
set -euo pipefail

APP_NAME="Adaptive Math Learning"
COMMAND_PATH="/Applications/${APP_NAME}.command"
REPO_DIR="/Users/fenmdc/Documents/Codex/2026-06-05/github-adaptive-math-learning/work/adaptive-math-learning"
SERVER_SCRIPT="${REPO_DIR}/scripts/start-local-server.sh"

chmod +x "${SERVER_SCRIPT}"

cat > "${COMMAND_PATH}" <<COMMAND
#!/usr/bin/env bash
set -euo pipefail

APP_URL="http://localhost:3017"
SERVER_SCRIPT="${SERVER_SCRIPT}"

echo "Adaptive Math Learning"
echo "Starting local server at \${APP_URL}"
echo
echo "Keep this Terminal window open while using the app."
echo "Press Control-C in this window to stop the server."
echo

if /usr/bin/curl -fsS "\${APP_URL}" >/dev/null 2>&1; then
  echo "Server is already running."
else
  "\${SERVER_SCRIPT}" &
  SERVER_PID="\$!"
  for i in {1..40}; do
    if /usr/bin/curl -fsS "\${APP_URL}" >/dev/null 2>&1; then
      break
    fi
    /bin/sleep 0.5
  done
fi

if /usr/bin/curl -fsS "\${APP_URL}" >/dev/null 2>&1; then
  /usr/bin/open "\${APP_URL}"
  wait "\${SERVER_PID:-}" 2>/dev/null || true
else
  echo "Server did not become ready. Check this window for errors."
  read -r -p "Press Return to close..."
  exit 1
fi
COMMAND

chmod +x "${COMMAND_PATH}"
/usr/bin/xattr -cr "${COMMAND_PATH}" 2>/dev/null || true

echo "Installed ${COMMAND_PATH}"
