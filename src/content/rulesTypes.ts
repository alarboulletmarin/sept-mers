export interface RuleBlock {
  kind: 'p' | 'ul' | 'ol'
  text?: string
  items?: string[]
}

export interface RuleSection {
  id: string
  title: string
  blocks: RuleBlock[]
  /** Remontée en tête du rappel rapide : la question posée le plus souvent. */
  quick?: boolean
}
