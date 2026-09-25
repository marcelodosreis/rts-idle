---
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.js"
  - "**/*.jsx"
---
# TypeScript/JavaScript Coding Style

> This file extends [common/coding-style.md](../common/coding-style.md) with TypeScript/JavaScript specific content.

## Types and Interfaces

Use types to make public APIs, shared models, and component props explicit, readable, and reusable.

### Public APIs

- Add parameter and return types to exported functions, shared utilities, and public class methods
- Let TypeScript infer obvious local variable types
- Extract repeated inline object shapes into named types or interfaces

```typescript
// WRONG: Exported function without explicit types
export function formatUser(user) {
  return `${user.firstName} ${user.lastName}`
}

// CORRECT: Explicit types on public APIs
interface User {
  firstName: string
  lastName: string
}

export function formatUser(user: User): string {
  return `${user.firstName} ${user.lastName}`
}
```

### Interfaces vs. Type Aliases

- Use `interface` for object shapes that may be extended or implemented
- Use `type` for unions, intersections, tuples, mapped types, and utility types
- Prefer string literal unions over `enum` unless an `enum` is required for interoperability

```typescript
interface User {
  id: string
  email: string
}

type UserRole = 'admin' | 'member'
type UserWithRole = User & {
  role: UserRole
}
```

### Typed Domain Strings (mandatory)

Every closed string set is an `as const` registry with a derived union type,
defined once (`docs/engineering-standard.md` → "Typed domain strings"). At
runtime boundaries, narrow with the `@rts/shared` parse helpers
(`isRecord`/`field`/`isInteger`) — never `as string`/`as unknown`, and never
`Record<string, X>` for a known key set. Discriminated dispatch ends with
`assertNever`.

```typescript
// WRONG: loose domain strings and unsafe casts
type Status = string
const status = input as string
const isDone = status === 'COMPLETED'
const table: Record<string, number> = { FOUNDATION: 0 }

// CORRECT: single-source registry, guard, exhaustive dispatch
export const STATUSES = ['FOUNDATION', 'UNDER_CONSTRUCTION', 'COMPLETED'] as const
export type Status = (typeof STATUSES)[number]
const status = field(input, 'status')
if (!isOneOf(STATUSES, status)) throw new Error('invalid status')
switch (status) {
  case 'FOUNDATION':
  case 'UNDER_CONSTRUCTION':
  case 'COMPLETED':
    break
  default:
    assertNever(status)
}
```

### Avoid `any`

- Avoid `any` in application code
- Use `unknown` for external or untrusted input, then narrow it safely
- Use generics when a value's type depends on the caller

```typescript
// WRONG: any removes type safety
function getErrorMessage(error: any) {
  return error.message
}

// CORRECT: unknown forces safe narrowing
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  return 'Unexpected error'
}
```

### React Props

- Define component props with a named `interface` or `type`
- Type callback props explicitly
- Do not use `React.FC` unless there is a specific reason to do so

```typescript
interface User {
  id: string
  email: string
}

interface UserCardProps {
  user: User
  onSelect: (id: string) => void
}

function UserCard({ user, onSelect }: UserCardProps) {
  return <button onClick={() => onSelect(user.id)}>{user.email}</button>
}
```

### JavaScript Files

- In `.js` and `.jsx` files, use JSDoc when types improve clarity and a TypeScript migration is not practical
- Keep JSDoc aligned with runtime behavior

```javascript
/**
 * @param {{ firstName: string, lastName: string }} user
 * @returns {string}
 */
export function formatUser(user) {
  return `${user.firstName} ${user.lastName}`
}
```

## Immutability

Use spread operator for immutable updates:

```typescript
interface User {
  id: string
  name: string
}

// WRONG: Mutation
function updateUser(user: User, name: string): User {
  user.name = name // MUTATION!
  return user
}

// CORRECT: Immutability
function updateUser(user: Readonly<User>, name: string): User {
  return {
    ...user,
    name
  }
}
```

## Error Handling

Use async/await with try-catch and narrow unknown errors safely:

```typescript
interface User {
  id: string
  email: string
}

declare function riskyOperation(userId: string): Promise<User>

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  return 'Unexpected error'
}

const logger = {
  error: (message: string, error: unknown) => {
    // Replace with your production logger (for example, pino or winston).
  }
}

async function loadUser(userId: string): Promise<User> {
  try {
    const result = await riskyOperation(userId)
    return result
  } catch (error: unknown) {
    logger.error('Operation failed', error)
    throw new Error(getErrorMessage(error))
  }
}
```

## Input Validation

Validate untrusted input at every boundary with typed guards that return the
narrowed value. In this repository, use the shared parse helpers rather than
`as` casts or schema libraries inside the simulation (which must stay
dependency-free).

```typescript
import { field, isInteger, isRecord } from '@rts/shared'

// CORRECT: fail-closed structural validation with typed narrowing
function readPort(value: unknown): number | null {
  const port = isRecord(value) ? field(value, 'port') : undefined
  return isInteger(port) ? port : null
}
```

Prefer returning a typed result (`{ ok: true, value } | { ok: false, errors }`)
over throwing from parsers, so callers handle failure explicitly.

## Console.log

- No `console.log` statements in production code
- Use proper logging libraries instead
- See hooks for automatic detection
