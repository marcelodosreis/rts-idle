# Agent Orchestration

## Available Agent Capabilities

Use only agents and tools provided by the active platform. Choose capabilities
by purpose; do not assume a particular agent name, path, or provider.

| Capability | Purpose | When to Use |
|-------|---------|-------------|
| Planning | Implementation planning | Complex features, refactoring |
| Architecture | System design | Architectural decisions |
| Test guidance | Test-driven development | New features, bug fixes |
| Code review | Quality review | After writing code |
| Security review | Security analysis | Security-sensitive changes |
| Build diagnosis | Fix build errors | When a build fails |
| E2E testing | Browser-flow validation | Critical user flows |
| Documentation | Documentation updates | Updating docs |

## Immediate Agent Usage

When the active platform provides a relevant capability, use it for complex
planning, quality review, testing, debugging, or architectural decisions.

## Parallel Task Execution

Use parallel execution only when the work is independent, the active platform
supports it, and the results can be collected before completion:

```markdown
# GOOD: Parallel execution
Launch available reviewers in parallel:
1. Agent 1: Security analysis of auth module
2. Agent 2: Performance review of cache system
3. Agent 3: Type checking of utilities

# BAD: Sequential when unnecessary
First agent 1, then agent 2, then agent 3
```

## Delegation Completion Contract

Applies to every agent at every depth (parent, child, grandchild):

1. **Your final message IS the deliverable.** Never end your turn with "waiting for background agents" — a spawned task is not a completed task. Ending your turn while children are running orphans their results (completed children cannot notify a parent whose turn has ended).
2. **If you delegate, you own collection.** Wait for results, integrate them, then return. Fire-and-forget delegation is forbidden.
3. **Decompose only when the work cannot fit in one context.** Do not re-delegate a task already sized for a single agent — depth is an outcome, not a plan.

> Rationale: observed failure mode — research agents followed "Parallel Task Execution" above, spawned children, and returned "waiting" as their final answer. All children completed successfully but their results were orphaned. The parallel rule without a completion contract produces zombie tasks.

## Multi-Perspective Analysis

For complex problems, use split role sub-agents:
- Factual reviewer
- Senior engineer
- Security expert
- Consistency reviewer
- Redundancy checker
