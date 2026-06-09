#!/usr/bin/env bash
set -euo pipefail

APP_NAME="Adaptive Math Learning"
APP_PATH="/Applications/${APP_NAME}.app"
REPO_DIR="/Users/fenmdc/Documents/Codex/2026-06-05/github-adaptive-math-learning/work/adaptive-math-learning"
LAUNCHER="${REPO_DIR}/scripts/launch-local-app.sh"
APPLESCRIPT="${REPO_DIR}/scripts/${APP_NAME}.applescript"
ICON_SOURCE="${REPO_DIR}/apps/web/public/icons/icon-512.png"
ICONSET="${REPO_DIR}/scripts/${APP_NAME}.iconset"

chmod +x "${LAUNCHER}"

cat > "${APPLESCRIPT}" <<'SCRIPT'
set launcherPath to POSIX path of (path to resource "launch-local-app.sh")
do shell script quoted form of launcherPath
SCRIPT

rm -rf "${APP_PATH}"
/usr/bin/osacompile -o "${APP_PATH}" "${APPLESCRIPT}"

mkdir -p "${APP_PATH}/Contents/Resources"
cp "${LAUNCHER}" "${APP_PATH}/Contents/Resources/launch-local-app.sh"
chmod +x "${APP_PATH}/Contents/Resources/launch-local-app.sh"
rm -rf "${ICONSET}"
mkdir -p "${ICONSET}"
/usr/bin/sips -z 16 16 "${ICON_SOURCE}" --out "${ICONSET}/icon_16x16.png" >/dev/null
/usr/bin/sips -z 32 32 "${ICON_SOURCE}" --out "${ICONSET}/icon_16x16@2x.png" >/dev/null
/usr/bin/sips -z 32 32 "${ICON_SOURCE}" --out "${ICONSET}/icon_32x32.png" >/dev/null
/usr/bin/sips -z 64 64 "${ICON_SOURCE}" --out "${ICONSET}/icon_32x32@2x.png" >/dev/null
/usr/bin/sips -z 128 128 "${ICON_SOURCE}" --out "${ICONSET}/icon_128x128.png" >/dev/null
/usr/bin/sips -z 256 256 "${ICON_SOURCE}" --out "${ICONSET}/icon_128x128@2x.png" >/dev/null
/usr/bin/sips -z 256 256 "${ICON_SOURCE}" --out "${ICONSET}/icon_256x256.png" >/dev/null
/usr/bin/sips -z 512 512 "${ICON_SOURCE}" --out "${ICONSET}/icon_256x256@2x.png" >/dev/null
/usr/bin/sips -z 512 512 "${ICON_SOURCE}" --out "${ICONSET}/icon_512x512.png" >/dev/null
cp "${ICON_SOURCE}" "${ICONSET}/icon_512x512@2x.png"
/usr/bin/iconutil -c icns "${ICONSET}" -o "${APP_PATH}/Contents/Resources/applet.icns"
rm -rf "${ICONSET}"

set_or_add_plist_string() {
  local key="$1"
  local value="$2"
  local plist="${APP_PATH}/Contents/Info.plist"
  if /usr/libexec/PlistBuddy -c "Print :${key}" "${plist}" >/dev/null 2>&1; then
    /usr/libexec/PlistBuddy -c "Set :${key} ${value}" "${plist}" >/dev/null
  else
    /usr/libexec/PlistBuddy -c "Add :${key} string ${value}" "${plist}" >/dev/null
  fi
}

set_or_add_plist_string "CFBundleName" "${APP_NAME}"
set_or_add_plist_string "CFBundleDisplayName" "${APP_NAME}"

/usr/bin/xattr -cr "${APP_PATH}" 2>/dev/null || true
/usr/bin/codesign --force --deep --sign - "${APP_PATH}" >/dev/null
/usr/bin/codesign --verify --deep --strict "${APP_PATH}" >/dev/null

echo "Installed ${APP_PATH}"
