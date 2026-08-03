/**
 * Jeu maison, dix icônes, aucune dépendance.
 * Trait de 1.75, extrémités arrondies, `currentColor`.
 */
export type IconName =
  | 'chevron'
  | 'plus'
  | 'check'
  | 'undo'
  | 'close'
  | 'book'
  | 'chart'
  | 'gear'
  | 'trash'
  | 'grip'

const paths: Record<IconName, React.ReactNode> = {
  chevron: <path d="M9 5l7 7-7 7" />,
  plus: (
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),
  check: <path d="M4 12.5l5 5L20 6.5" />,
  undo: (
    <>
      <path d="M4 9h11a5 5 0 0 1 0 10H8" />
      <path d="M8 5L4 9l4 4" />
    </>
  ),
  close: (
    <>
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </>
  ),
  book: (
    <>
      <path d="M5 4h9a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z" />
      <path d="M17 7h2v13H8" />
    </>
  ),
  chart: (
    <>
      <path d="M4 20V4" />
      <path d="M4 20h16" />
      <path d="M8 20v-6" />
      <path d="M13 20V9" />
      <path d="M18 20v-9" />
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2.5M12 18.5V21M4.2 7.5l2.2 1.3M17.6 15.2l2.2 1.3M4.2 16.5l2.2-1.3M17.6 8.8l2.2-1.3" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16" />
      <path d="M10 7V5h4v2" />
      <path d="M6 7l1 13h10l1-13" />
    </>
  ),
  grip: (
    <>
      <path d="M9 6h.01M9 12h.01M9 18h.01" />
      <path d="M15 6h.01M15 12h.01M15 18h.01" />
    </>
  ),
}

export type IconRotation = 'up' | 'right' | 'down' | 'left'

const rotations: Record<IconRotation, number> = { right: 0, down: 90, left: 180, up: 270 }

interface IconProps {
  name: IconName
  size?: number
  rotate?: IconRotation
  className?: string
}

export function Icon({ name, size = 20, rotate, className }: IconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      style={rotate ? { transform: `rotate(${rotations[rotate]}deg)` } : undefined}
    >
      {paths[name]}
    </svg>
  )
}

/**
 * Le logotype : sept traits de longueurs inégales, une houle vue de profil.
 * Sept traits pour sept mers.
 */
export function Logo({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <g stroke="currentColor" strokeWidth={3} strokeLinecap="round">
        <path d="M10 12h12" />
        <path d="M26 12h12" />
        <path d="M8 20h16" />
        <path d="M28 20h12" />
        <path d="M12 28h20" />
        <path d="M36 28h4" />
        <path d="M10 36h28" />
      </g>
    </svg>
  )
}
