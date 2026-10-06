#!/usr/bin/env bash
set -euo pipefail

# Accure IQX CLI Uninstaller

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "\n${BOLD}Accure IQX CLI Uninstaller${NC}"
echo "────────────────────────────────────────"

REMOVED=0

# Detect candidates
TARGETS=(
  "/usr/local/bin/iqx"
  "$HOME/.local/bin/iqx"
)

WHICH_IQX=$(which iqx 2>/dev/null || true)
if [ -n "$WHICH_IQX" ]; then
  TARGETS+=("$WHICH_IQX")
fi

for TARGET in "${TARGETS[@]}"; do
  if [ -e "$TARGET" ] || [ -L "$TARGET" ]; then
    echo -e "Removing executable: ${BOLD}$TARGET${NC}"
    if rm -f "$TARGET" 2>/dev/null; then
      echo -e "${GREEN}✔ Removed $TARGET${NC}"
      REMOVED=1
    else
      echo -e "${YELLOW}Need sudo permissions to remove $TARGET...${NC}"
      sudo rm -f "$TARGET"
      echo -e "${GREEN}✔ Removed $TARGET${NC}"
      REMOVED=1
    fi
  fi
done

if [ -d "$HOME/.iqx" ]; then
  read -r -p "Do you also want to remove ~/.iqx config and stored tokens? [y/N] " response
  case "$response" in
    [yY][eE][sS]|[yY])
      rm -rf "$HOME/.iqx"
      echo -e "${GREEN}✔ Removed $HOME/.iqx${NC}"
      ;;
    *)
      echo "Kept $HOME/.iqx configuration."
      ;;
  esac
fi

if [ "$REMOVED" -eq 1 ]; then
  echo -e "\n${GREEN}${BOLD}✔ IQX CLI has been uninstalled successfully.${NC}\n"
else
  echo -e "\n${YELLOW}No IQX CLI installation found.${NC}\n"
fi
