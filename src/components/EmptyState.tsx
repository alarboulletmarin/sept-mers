import type { ReactNode } from 'react'

interface EmptyStateProps {
  title: string
  body: string
  action?: ReactNode
}

/** Un titre, une phrase qui dit quoi faire, un bouton. Rien d'autre. */
export function EmptyState({ title, body, action }: EmptyStateProps) {
  return (
    <div className="card stack">
      <h2 className="t-section">{title}</h2>
      <p className="t-body muted">{body}</p>
      {action}
    </div>
  )
}
