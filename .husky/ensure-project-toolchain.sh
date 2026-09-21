#!/bin/sh

set -eu

repo_root=$(git rev-parse --show-toplevel)
cd "$repo_root"

if ! command -v nvm >/dev/null 2>&1; then
  nvm_dir=${NVM_DIR:-"$HOME/.nvm"}
  if [ ! -s "$nvm_dir/nvm.sh" ]; then
    echo "❌ NVM is required. Install NVM, then run: nvm install" >&2
    exit 1
  fi
  # shellcheck disable=SC1090
  . "$nvm_dir/nvm.sh"
fi

required_node=$(tr -d '[:space:]' < .nvmrc)
nvm use --silent "$required_node" >/dev/null

actual_node=$(node -p "process.versions.node.split('.')[0]")
required_node_major=$(printf '%s' "$required_node" | sed 's/[^0-9].*//')
if [ "$actual_node" != "$required_node_major" ]; then
  echo "❌ Project requires Node $required_node_major, active Node is $actual_node" >&2
  exit 1
fi

if [ "${PROJECT_TOOLCHAIN_REQUIRE_PNPM:-0}" = "1" ]; then
  expected_pnpm=$(node -p "require('./package.json').packageManager.split('@')[1]")
  actual_pnpm=$(corepack pnpm --version)
  if [ "$actual_pnpm" != "$expected_pnpm" ]; then
    echo "❌ Project requires pnpm $expected_pnpm, active pnpm is $actual_pnpm" >&2
    echo "   Run: corepack enable && corepack pnpm --version" >&2
    exit 1
  fi
fi
