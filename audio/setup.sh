#!/usr/bin/env bash
set -euo pipefail

# Audio environment setup — checks and installs SuperCollider, ffmpeg, sox

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ERRORS=0

check_command() {
  local cmd="$1"
  local install_hint="$2"
  if command -v "$cmd" &>/dev/null; then
    echo -e "${GREEN}✓${NC} $cmd found: $(command -v "$cmd")"
  else
    echo -e "${RED}✗${NC} $cmd not found"
    echo -e "  ${YELLOW}Install:${NC} $install_hint"
    ERRORS=$((ERRORS + 1))
  fi
}

echo "=== Audio Environment Setup ==="
echo ""

# Check brew
if ! command -v brew &>/dev/null; then
  echo -e "${RED}✗${NC} Homebrew not found"
  echo -e "  ${YELLOW}Install:${NC} /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
  exit 1
fi
echo -e "${GREEN}✓${NC} brew found"

# Check required tools
check_command "sclang" "brew install --cask supercollider"
check_command "ffmpeg" "brew install ffmpeg"
check_command "sox" "brew install sox"

echo ""

if [ "$ERRORS" -gt 0 ]; then
  echo -e "${RED}$ERRORS tool(s) missing. Install them and re-run.${NC}"
  exit 1
fi

# Test SC headless boot
echo "Testing SuperCollider headless boot..."
if sclang -i none -e "0.exit" 2>/dev/null; then
  echo -e "${GREEN}✓${NC} sclang headless boot OK"
else
  echo -e "${RED}✗${NC} sclang headless boot failed"
  exit 1
fi

echo ""
echo -e "${GREEN}All checks passed!${NC}"