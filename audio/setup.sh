#!/usr/bin/env bash
set -euo pipefail

# Audio environment setup v2 — checks SuperCollider, ffmpeg, sox, GHCup, GHC, Tidal, SuperDirt

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

# Test SC headless boot (required before B-LIVE checks)
echo "Testing SuperCollider headless boot..."
if sclang -i none -e "0.exit" 2>/dev/null; then
  echo -e "${GREEN}✓${NC} sclang headless boot OK"
else
  echo -e "${RED}✗${NC} sclang headless boot failed"
  exit 1
fi

echo ""
echo "=== B-LIVE Dependencies ==="
echo ""

# GHCup
if command -v ghcup &>/dev/null; then
  echo -e "${GREEN}✓${NC} ghcup found: $(ghcup --version 2>&1 | head -1)"
else
  echo -e "${RED}✗${NC} ghcup not found"
  echo -e "  ${YELLOW}Install:${NC} brew install ghcup"
  echo -e "  ${YELLOW}Fallback:${NC} curl with SHA256 verification (see PRD Section 6)"
  ERRORS=$((ERRORS + 1))
fi

# GHC version check (minimum 9.4, recommended 9.6)
if command -v ghc &>/dev/null; then
  GHC_VERSION=$(ghc --numeric-version 2>/dev/null || echo "0.0")
  GHC_MAJOR=$(echo "$GHC_VERSION" | cut -d. -f1)
  GHC_MINOR=$(echo "$GHC_VERSION" | cut -d. -f2)
  if [ "$GHC_MAJOR" -gt 9 ] || ([ "$GHC_MAJOR" -eq 9 ] && [ "$GHC_MINOR" -ge 4 ]); then
    echo -e "${GREEN}✓${NC} ghc $GHC_VERSION (>= 9.4)"
    if [ "$GHC_MAJOR" -eq 9 ] && [ "$GHC_MINOR" -lt 6 ]; then
      echo -e "  ${YELLOW}Note:${NC} GHC 9.6 recommended. Current: $GHC_VERSION"
    fi
  else
    echo -e "${RED}✗${NC} ghc $GHC_VERSION too old (minimum 9.4)"
    echo -e "  ${YELLOW}Install:${NC} ghcup install ghc 9.6"
    ERRORS=$((ERRORS + 1))
  fi
else
  echo -e "${RED}✗${NC} ghc not found"
  echo -e "  ${YELLOW}Install:${NC} ghcup install ghc 9.6"
  ERRORS=$((ERRORS + 1))
fi

# cabal + tidal
if command -v cabal &>/dev/null; then
  echo -e "${GREEN}✓${NC} cabal found: $(cabal --version 2>&1 | head -1)"
  if cabal list --installed tidal 2>/dev/null | grep -q "tidal"; then
    echo -e "${GREEN}✓${NC} tidal package installed"
  else
    echo -e "${RED}✗${NC} tidal package not found"
    echo -e "  ${YELLOW}Install:${NC} cabal install tidal"
    ERRORS=$((ERRORS + 1))
  fi
else
  echo -e "${RED}✗${NC} cabal not found"
  echo -e "  ${YELLOW}Install:${NC} ghcup install cabal"
  ERRORS=$((ERRORS + 1))
fi

# SuperDirt Quark
echo "Checking SuperDirt Quark..."
if sclang -i none -e 'Quarks.isInstalled("SuperDirt").postln; 0.exit' 2>/dev/null | grep -q "true"; then
  echo -e "${GREEN}✓${NC} superdirt Quark installed"
else
  echo -e "${RED}✗${NC} superdirt Quark not found"
  echo -e "  ${YELLOW}Install:${NC} sclang -e 'Quarks.install(\"SuperDirt\"); 0.exit'"
  ERRORS=$((ERRORS + 1))
fi

echo ""

if [ "$ERRORS" -gt 0 ]; then
  echo -e "${RED}$ERRORS issue(s) found. Fix them and re-run.${NC}"
  exit 1
fi

echo -e "${GREEN}All checks passed!${NC}"