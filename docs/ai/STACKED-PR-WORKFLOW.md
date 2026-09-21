# Stacked Pull Request Workflow

Use stacked pull requests when one change depends on another. The child branch
targets its parent branch until the parent is merged.

## Rules

- Run `nvm install && nvm use` before project commands.
- Never use `--no-verify`; fix the toolchain or the change instead.
- Create the child from the current remote parent branch.
- Keep the child linear with `rebase`; do not merge the parent into the child.
- Check ancestry and the effective diff before every push or PR update.

## Start

```bash
nvm install
nvm use
corepack enable
corepack pnpm --version
corepack pnpm run git:stack -- start fix/control-click-attack-selection feat/build-003-barracks
```

After implementing and committing the child:

```bash
corepack pnpm run git:stack -- check fix/control-click-attack-selection feat/build-003-barracks
corepack pnpm run verify
git push --set-upstream origin feat/build-003-barracks
corepack pnpm run git:stack -- open fix/control-click-attack-selection feat/build-003-barracks
```

The intended graph is `origin/fix/control-click-attack-selection` followed by
`feat/build-003-barracks`. The child PR diff must contain only child commits.

## Update and promote

When the parent advances, rebase the child; do not merge the parent into it:

```bash
corepack pnpm run git:stack -- update fix/control-click-attack-selection feat/build-003-barracks
git push --force-with-lease origin feat/build-003-barracks
```

After the parent is merged into `main`, move the child onto the new base:

```bash
git fetch origin
git switch feat/build-003-barracks
git rebase --onto origin/main origin/fix/control-click-attack-selection
git push --force-with-lease origin feat/build-003-barracks
gh pr edit <child-pr> --base main
```

Resolve conflicts with `git add` and `git rebase --continue`; abort with
`git rebase --abort` when necessary.

## Recovery

For a child created from the wrong base, preserve it and rebase only its work:

```bash
git fetch origin
git switch feat/child
git branch backup/feat-child-before-rebase
git rebase --onto origin/parent origin/wrong-base
corepack pnpm run git:stack -- check parent feat/child
```

If history is unclear, create a fresh branch from `origin/parent` and
cherry-pick only the child commits.

## Toolchain

Hooks load `.nvmrc` automatically. If NVM or Node 24 is missing, run:

```bash
nvm install
nvm use
corepack enable
corepack pnpm install --frozen-lockfile
```

Do not bypass hooks. CI uses Node 24 and pnpm 10.33.2.
