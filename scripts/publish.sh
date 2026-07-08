#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/.env.publish"
TARGET="${1:-all}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "缺少 $ENV_FILE，请先复制 .env.publish.example 并填入 Token"
  exit 1
fi

# shellcheck disable=SC1090
source "$ENV_FILE"

if [[ -z "${OVSX_PAT:-}" || -z "${VSCE_PAT:-}" ]]; then
  echo "请在 .env.publish 中配置 OVSX_PAT 和 VSCE_PAT"
  exit 1
fi

cd "$ROOT"
npm run compile
vsce package

VERSION="$(node -p "require('./package.json').version")"
VSIX="hover-i18n-hint-${VERSION}.vsix"

if [[ ! -f "$VSIX" ]]; then
  echo "未找到打包文件: $VSIX"
  exit 1
fi

publish_ovsx() {
  echo "发布到 OpenVSX..."
  ovsx publish "$VSIX" -p "$OVSX_PAT"
}

publish_marketplace() {
  echo "发布到 VS Code Marketplace..."
  vsce publish -p "$VSCE_PAT"
}

case "$TARGET" in
  ovsx)
    publish_ovsx
    ;;
  marketplace)
    publish_marketplace
    ;;
  all)
    publish_ovsx
    publish_marketplace
    ;;
  *)
    echo "用法: $0 [all|ovsx|marketplace]"
    exit 1
    ;;
esac

echo "发布完成"
