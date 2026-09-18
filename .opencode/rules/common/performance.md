# Performance Optimization

## Capability Selection Strategy

Use the least costly available capability that can safely complete the task.
Reserve deeper reasoning or additional reviewers for architectural decisions,
unfamiliar systems, or high-risk analysis.

## Context Window Management

Avoid last 20% of context window for:
- Large-scale refactoring
- Feature implementation spanning multiple files
- Debugging complex interactions

Lower context sensitivity tasks:
- Single-file edits
- Independent utility creation
- Documentation updates
- Simple bug fixes

## Planning and Deep Reasoning

When the active platform offers planning, reasoning controls, or parallel
review, use them proportionally for complex work. Do not assume provider-
specific controls or configuration paths.

For complex tasks requiring deep reasoning:
1. Use a structured plan when needed
2. Use multiple critique rounds when the risk justifies them
3. Use independent review perspectives when available

## Build Troubleshooting

If build fails:
1. Use an available build-diagnosis capability
2. Analyze error messages
3. Fix incrementally
4. Verify after each fix
