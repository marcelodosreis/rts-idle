import { NavLink } from 'react-router-dom'

const LABORATORY_PAGES = [
  { to: '/laboratory', label: 'Browser', end: true },
  { to: '/laboratory/editor', label: 'Editor', end: false },
  { to: '/laboratory/diagnostics', label: 'Diagnostics', end: false },
  { to: '/laboratory/report', label: 'Report', end: false }
] as const

export function LaboratoryNavigation() {
  return (
    <div className="border-b border-border/50 bg-card/50">
      <nav
        aria-label="Laboratory pages"
        className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-1 px-4 py-2 sm:px-6"
      >
        {LABORATORY_PAGES.map((page) => (
          <NavLink
            key={page.to}
            end={page.end}
            className={({ isActive }) =>
              `rounded-md px-3 py-1.5 text-xs transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`
            }
            to={page.to}
          >
            {page.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
