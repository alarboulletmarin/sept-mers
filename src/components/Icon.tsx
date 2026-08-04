/**
 * Jeu maison, douze icônes, aucune dépendance.
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
  | 'history'
  | 'players'

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
  /* Un livre ouvert, deux plats et une reliure. La forme d'avant — un plat
     unique avec un second décalé derrière — se lisait comme un carnet fermé,
     ou comme rien du tout à 17 px. */
  book: (
    <>
      <path d="M12 7.25v12" />
      <path d="M12 7.25C10.4 5.9 8.3 5.25 5.5 5.25H3v12h2.5c2.8 0 4.9.65 6.5 2" />
      <path d="M12 7.25c1.6-1.35 3.7-2 6.5-2H21v12h-2.5c-2.8 0-4.9.65-6.5 2" />
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
  /* Deux curseurs plutôt qu'une roue dentée : à 20 px, les six dents d'un
     engrenage se referment en soleil et l'icône ne veut plus rien dire. */
  gear: (
    <>
      <path d="M4 8.5h4.5M13.5 8.5H20" />
      <path d="M4 15.5h6.5M15.5 15.5H20" />
      <circle cx="11" cy="8.5" r="2.5" />
      <circle cx="13" cy="15.5" r="2.5" />
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
  history: (
    <>
      <circle cx="12" cy="12" r="8.25" />
      <path d="M12 7.25V12l3.25 2" />
    </>
  ),
  players: (
    <>
      <circle cx="9.25" cy="9" r="3.25" />
      <path d="M3.5 19.25a5.75 5.75 0 0 1 11.5 0" />
      <path d="M16.25 6.4a3.25 3.25 0 0 1 0 5.2" />
      <path d="M17.5 15.1a5.75 5.75 0 0 1 3 4.15" />
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
 * Le logotype : un crâne couronné, plein, d'un seul tenant.
 *
 * Le tracé est le même dans les trois endroits qui le portent — ici, dans
 * `public/icons/favicon.svg` et dans `scripts/make-icons.py` — et un test le
 * vérifie, parce qu'une divergence ne se verrait qu'à l'icône installée.
 *
 * Il remplit son cadre, sans marge : à 21 px dans la barre d'onglets, chaque
 * unité compte. Ce sont les tuiles — favicon, icônes du manifeste — qui posent
 * leur propre marge autour de lui.
 */
const LOGO_PATH =
  'M23 46.93C22.32 46.76 21.93 46.26 21.79 45.36C21.54 43.81 20.57 43.71 19.74 45.14C19.12 46.21 18.45 46.58 17.63 46.3C16.48 45.92 16.24 45 16.83 43.18C17.22 42 17.24 41.38 16.93 40.97L16.76 40.75L16.06 40.76C13.31 40.82 10.89 38.69 10.58 35.94C10.26 33.02 10.96 31.75 12.87 31.81C13.84 31.84 14.18 32.01 15.22 33C16.15 33.88 16.43 34.04 17.07 34.04C19.45 34.02 20.14 30.25 17.96 29.18C16.93 28.67 16.14 28.84 15.12 29.77C14 30.79 12.49 30.81 11.39 29.82C10.6 29.12 10.42 28.37 10.41 25.77C10.41 23.57 10.45 23.34 11.04 22.34C11.41 21.71 11.42 21.7 11.05 21.89C10.9 21.96 10.77 22.02 10.75 22.02C10.74 22.02 10.71 21.47 10.69 20.8C10.61 18.61 9.96 15.6 8.65 11.36C8.36 10.43 8.3 10.07 8.49 10.42C8.75 10.9 11.08 12.99 12.11 13.69C16.62 16.7 19.53 15.22 21.59 8.87C22.29 6.68 22.88 4.46 23.19 2.74C23.29 2.21 23.41 1.59 23.45 1.37L23.54 0.97L23.65 1.44C23.71 1.69 23.9 2.51 24.06 3.24C25.59 10.05 27.42 13.65 29.99 14.93C31.9 15.88 33.93 15.08 37.89 11.82C39.09 10.82 39.65 10.37 39.68 10.37C39.69 10.37 39.59 10.55 39.44 10.76C38.61 11.99 37.71 14.53 36.72 18.44C36.28 20.18 35.95 21.64 35.95 21.83C35.95 22.03 35.78 22.05 35.51 21.89C35.19 21.69 35.18 21.74 35.48 22.1C36.13 22.86 36.38 23.49 36.52 24.74C37.01 29.03 35.89 30.84 32.7 30.88C31.89 30.89 31.63 30.74 31.08 29.93C29.82 28.06 27.04 28.99 27.02 31.3C27.01 32.56 28.09 33.73 29.34 33.8C30.02 33.84 30.32 33.7 30.96 33.05C31.71 32.29 32.13 32.1 33.04 32.1C34.61 32.1 35.54 33.3 35.76 35.6C35.94 37.46 35.49 38.93 34.41 40.04C33.55 40.92 32.89 41.17 31.47 41.18C30.41 41.18 29.76 41.26 29.35 41.44L29.05 41.57L29.2 41.92C29.79 43.42 29.91 44.22 29.63 44.98C29.15 46.27 27.69 46.65 26.86 45.7C26.64 45.45 26.31 44.86 26.31 44.71C26.31 44.47 25.98 43.94 25.78 43.86C25.26 43.64 24.9 44.17 24.84 45.26C24.8 46 24.74 46.15 24.41 46.52C24.1 46.87 23.49 47.04 23 46.93Z' +
  ' M26.26 39.98C27.01 39.69 27 38.39 26.22 36.12C25.81 34.9 25.3 34.11 24.48 33.42C23.44 32.54 22.46 32.73 21.83 33.93C21.36 34.85 20.34 38.01 20.31 38.7C20.26 39.62 20.55 40 21.31 40C22.02 40 22.51 39.63 23.03 38.68C23.19 38.38 23.37 38.13 23.41 38.11C23.51 38.08 23.89 38.59 24.2 39.18C24.62 39.97 25.44 40.29 26.26 39.98Z' +
  ' M29.97 39.4C30.3 39.19 31.08 38.46 31.39 38.07C32.13 37.13 32.14 36.66 31.39 35.99C30.93 35.58 30.86 35.6 31.21 36.06C31.74 36.77 31.58 37.27 30.43 38.54C29.68 39.37 29.33 39.36 28.44 38.51C27.9 38 27.78 38 28.14 38.53C28.71 39.38 29.44 39.72 29.97 39.4Z' +
  ' M14.99 38.34C14.97 38.32 14.78 38.25 14.57 38.17C13.61 37.84 13 37.21 12.54 36.12C12.37 35.7 12.35 36 12.52 36.6C12.77 37.51 13.16 37.99 13.88 38.24C14.17 38.34 15.07 38.42 14.99 38.34Z' +
  ' M24.3 27.77C26.45 24.98 28.25 22.89 28.83 22.5C29.36 22.15 29.56 22.2 30.37 22.86C31.73 23.96 31.73 24.46 30.41 25.89C29.62 26.74 29.5 27.14 29.95 27.47C30.26 27.71 32.05 27.68 32.51 27.44C33.92 26.69 34.28 24.68 33.34 22.72C32.85 21.68 31.68 20.1 31.25 19.9C30.56 19.57 28.61 18.99 26.81 18.58C23.05 17.73 20.71 17.95 16.23 19.56L15.09 19.97L14.48 20.58C14.14 20.91 13.87 21.19 13.88 21.2C13.89 21.21 14.14 21.15 14.43 21.06C19.12 19.67 22.39 20.81 21.43 23.51C21.09 24.5 20.73 24.65 19.36 24.34C17.7 23.97 16.44 25.95 17.91 26.62C18.24 26.77 18.4 26.8 19.27 26.83C20.46 26.86 20.99 26.99 21.92 27.46C22.64 27.82 23.39 28.32 23.45 28.48C23.53 28.69 23.68 28.57 24.3 27.77Z'

export function Logo({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d={LOGO_PATH} />
    </svg>
  )
}
