import { FILLS, type FillKind } from './series.ts'

/**
 * Les motifs de remplissage des barres, définis une fois par graphique.
 * Ils sont tracés en `currentColor` : un motif posé sur un widget encre
 * s'éclaircit tout seul.
 */
export function Patterns({ id }: { id: string }) {
  return (
    <defs>
      <pattern id={`${id}-hatch`} width="5" height="5" patternUnits="userSpaceOnUse">
        <path d="M0 5 L5 0" stroke="currentColor" strokeWidth="1.6" />
      </pattern>
      <pattern id={`${id}-backhatch`} width="5" height="5" patternUnits="userSpaceOnUse">
        <path d="M0 0 L5 5" stroke="currentColor" strokeWidth="1.6" />
      </pattern>
      <pattern id={`${id}-grid`} width="5" height="5" patternUnits="userSpaceOnUse">
        <path d="M0 5 L5 0 M0 0 L5 5" stroke="currentColor" strokeWidth="1.2" />
      </pattern>
      <pattern id={`${id}-dots`} width="4" height="4" patternUnits="userSpaceOnUse">
        <circle cx="2" cy="2" r="1.1" fill="currentColor" />
      </pattern>
    </defs>
  )
}

/** L'attribut de remplissage correspondant, à poser sur un `<rect>`. */
export function fillProps(id: string, kind: FillKind) {
  switch (kind) {
    case 'solid':
      return { fill: 'currentColor' }
    case 'outline':
      return { fill: 'none', stroke: 'currentColor', strokeWidth: 1.5 }
    default:
      return { fill: `url(#${id}-${kind})`, stroke: 'currentColor', strokeWidth: 1 }
  }
}

/** Aperçu du même remplissage pour la légende, en CSS. */
export function swatchStyle(kind: FillKind): React.CSSProperties {
  const line = 'currentColor'
  switch (kind) {
    case 'solid':
      return { background: line }
    case 'outline':
      return { boxShadow: 'inset 0 0 0 1.5px currentColor' }
    case 'hatch':
      return { backgroundImage: `repeating-linear-gradient(45deg, ${line} 0 1.5px, transparent 1.5px 4px)`, boxShadow: 'inset 0 0 0 1px currentColor' }
    case 'backhatch':
      return { backgroundImage: `repeating-linear-gradient(-45deg, ${line} 0 1.5px, transparent 1.5px 4px)`, boxShadow: 'inset 0 0 0 1px currentColor' }
    case 'grid':
      return { backgroundImage: `repeating-linear-gradient(45deg, ${line} 0 1px, transparent 1px 4px), repeating-linear-gradient(-45deg, ${line} 0 1px, transparent 1px 4px)`, boxShadow: 'inset 0 0 0 1px currentColor' }
    case 'dots':
      return { backgroundImage: `radial-gradient(currentColor 1px, transparent 1.2px)`, backgroundSize: '4px 4px', boxShadow: 'inset 0 0 0 1px currentColor' }
  }
}

export { FILLS }
