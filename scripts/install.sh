#!/bin/sh
set -e

REPO="Accure-Inc/iqx-cli"
INSTALL_DIR="/usr/local/bin"
ALT_INSTALL_DIR="$HOME/.local/bin"

# Detect OS
OS="$(uname -s)"
case "$OS" in
  Darwin) TARGET_OS="darwin" ;;
  Linux) TARGET_OS="linux" ;;
  *) echo "Unsupported operating system: $OS" && exit 1 ;;
esac

# Detect Architecture
ARCH="$(uname -m)"
case "$ARCH" in
  x86_64|amd64) TARGET_ARCH="x64" ;;
  arm64|aarch64) TARGET_ARCH="arm64" ;;
  *) echo "Unsupported architecture: $ARCH" && exit 1 ;;
esac

BINARY_NAME="iqx-${TARGET_OS}-${TARGET_ARCH}"
RELEASE_URL="https://github.com/${REPO}/releases/latest/download/${BINARY_NAME}"

echo "⚡ Installing IQX CLI for ${TARGET_OS}-${TARGET_ARCH}..."

# Download binary
TMP_FILE="$(mktemp)"
if command -v curl >/dev/null 2>&1; then
  curl -fsSL "$RELEASE_URL" -o "$TMP_FILE"
elif command -v wget >/dev/null 2>&1; then
  wget -qO "$TMP_FILE" "$RELEASE_URL"
else
  echo "Error: curl or wget is required to install IQX CLI." && exit 1
fi

chmod +x "$TMP_FILE"

# Place in /usr/local/bin or ~/.local/bin
if [ -w "$INSTALL_DIR" ]; then
  mv "$TMP_FILE" "$INSTALL_DIR/iqx"
  INSTALLED_PATH="$INSTALL_DIR/iqx"
else
  mkdir -p "$ALT_INSTALL_DIR"
  mv "$TMP_FILE" "$ALT_INSTALL_DIR/iqx"
  INSTALLED_PATH="$ALT_INSTALL_DIR/iqx"
fi

echo "✔ IQX CLI installed successfully to ${INSTALLED_PATH}!"
echo ""
echo "Get started:"
echo "  iqx --help"
echo "  iqx auth login"
echo "  iqx chat"
