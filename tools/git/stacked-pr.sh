#!/bin/sh

set -eu

if [ "${1:-}" = "--" ]; then
  shift
fi

usage() {
  cat >&2 <<'EOF'
Usage:
  corepack pnpm run git:stack -- start <parent> <child>
  corepack pnpm run git:stack -- check <parent> [child]
  corepack pnpm run git:stack -- update <parent> [child]
  corepack pnpm run git:stack -- open <parent> [child]

Examples:
  corepack pnpm run git:stack -- start fix/control-click-attack-selection feat/build-003-barracks
  corepack pnpm run git:stack -- check fix/control-click-attack-selection feat/build-003-barracks
  corepack pnpm run git:stack -- update fix/control-click-attack-selection feat/build-003-barracks
  corepack pnpm run git:stack -- open fix/control-click-attack-selection feat/build-003-barracks
EOF
  exit 2
}

command_name=${1:-}
parent=${2:-}
child=${3:-}

if [ -z "$command_name" ] || [ -z "$parent" ]; then
  usage
fi

repo_root=$(git rev-parse --show-toplevel)
cd "$repo_root"

remote_parent="origin/$parent"

fetch_parent() {
  git fetch origin "$parent"
  if ! git show-ref --verify --quiet "refs/remotes/$remote_parent"; then
    echo "❌ Remote parent branch not found: $remote_parent" >&2
    exit 1
  fi
}

resolve_child() {
  if [ -n "$child" ]; then
    printf '%s\n' "$child"
  else
    git branch --show-current
  fi
}

require_clean_tree() {
  if [ -n "$(git status --short)" ]; then
    echo "❌ Working tree is not clean. Commit or stash changes before this operation." >&2
    exit 1
  fi
}

check_base() {
  current_child=$(resolve_child)
  if ! git show-ref --verify --quiet "refs/heads/$current_child"; then
    echo "❌ Child branch not found: $current_child" >&2
    exit 1
  fi
  if ! git merge-base --is-ancestor "$remote_parent" "$current_child"; then
    echo "❌ $current_child does not contain the current base $remote_parent" >&2
    echo "   Run: corepack pnpm run git:stack -- update $parent $current_child" >&2
    exit 1
  fi
  echo "✅ Base: $remote_parent"
  echo "✅ Child: $current_child"
  git diff --stat "$remote_parent...$current_child"
}

case "$command_name" in
  start)
    if [ -z "$child" ]; then
      usage
    fi
    require_clean_tree
    fetch_parent
    if git show-ref --verify --quiet "refs/heads/$child"; then
      echo "❌ Local child branch already exists: $child" >&2
      exit 1
    fi
    git switch --detach "$remote_parent"
    git switch --create "$child"
    echo "✅ Created $child from $remote_parent"
    ;;
  check)
    fetch_parent
    check_base
    ;;
  update)
    require_clean_tree
    fetch_parent
    current_child=$(resolve_child)
    git switch "$current_child"
    git rebase "$remote_parent"
    check_base
    ;;
  open)
    fetch_parent
    check_base
    current_child=$(resolve_child)
    gh pr create --base "$parent" --head "$current_child" --fill
    ;;
  *)
    usage
    ;;
esac
