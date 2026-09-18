# Quality Checklists

Load only for the corresponding task.

## Browser/UI

- Use semantic controls and accessible names.
- Verify keyboard focus, empty/loading/error states, and responsive layout.
- Keep gameplay authority in the server/simulation; UI owns presentation only.
- Add a focused browser regression for user-visible behavior.

## TypeScript

- Keep strict types and explicit public API types.
- Do not use `any` or unsafe casts at external boundaries.
- Prefer pure functions and named domain types.
- Keep modules cohesive and avoid generic utility dumping grounds.

## Tests

- Use deterministic fixtures and stable seeds.
- Prefer real implementations over mocks at integration boundaries.
- Assert state and outcomes, not incidental call order.
- Keep failures concise: report counts, indexes, and representative values.
