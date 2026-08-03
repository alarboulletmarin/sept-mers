import type { ReactNode } from 'react'
import { Caption, Tag, Widget, WidgetTitle } from './Widget.tsx'

interface EmptyStateProps {
  tag?: string
  title: string
  body: string
  action?: ReactNode
}

/** Un widget, un titre, une phrase qui dit quoi faire, un bouton. */
export function EmptyState({ tag, title, body, action }: EmptyStateProps) {
  return (
    <Widget surface="sunken" span="md">
      {tag && <Tag>{tag}</Tag>}
      <WidgetTitle>{title}</WidgetTitle>
      <Caption>{body}</Caption>
      {action}
    </Widget>
  )
}
