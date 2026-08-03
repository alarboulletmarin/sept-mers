/**
 * Géométrie des graphiques. Tout se calcule dans le `viewBox`, jamais en
 * pixels d'écran : le SVG s'étire, les proportions tiennent.
 */

export interface Box {
  width: number
  height: number
  top: number
  right: number
  bottom: number
  left: number
}

export function plotArea(box: Box): { x: number; y: number; width: number; height: number } {
  return {
    x: box.left,
    y: box.top,
    width: box.width - box.left - box.right,
    height: box.height - box.top - box.bottom,
  }
}

/**
 * Graduations lisibles autour d'un intervalle, quatre au maximum.
 * On préfère des pas de 1, 2, 5 ou 10 fois une puissance de dix.
 */
export function niceTicks(min: number, max: number, count = 4): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0]
  if (min === max) return [min]

  const span = max - min
  const rough = span / Math.max(1, count - 1)
  const magnitude = 10 ** Math.floor(Math.log10(Math.abs(rough) || 1))
  const normalised = rough / magnitude
  const step =
    (normalised <= 1 ? 1 : normalised <= 2 ? 2 : normalised <= 5 ? 5 : 10) * magnitude

  const start = Math.floor(min / step) * step
  const end = Math.ceil(max / step) * step

  const ticks: number[] = []
  for (let value = start; value <= end + step / 2; value += step) {
    // Le pas peut être fractionnaire : on arrondit pour éviter -0 et 1e-15.
    ticks.push(Math.round(value * 1e6) / 1e6)
  }
  return ticks
}

/** Échelle linéaire d'un domaine vers une plage. */
export function scale(domain: [number, number], range: [number, number]) {
  const [d0, d1] = domain
  const [r0, r1] = range
  const span = d1 - d0
  return (value: number) => (span === 0 ? (r0 + r1) / 2 : r0 + ((value - d0) / span) * (r1 - r0))
}

/**
 * Polyligne sans lissage : les manches sont des points discrets, une courbe
 * mentirait sur les valeurs intermédiaires.
 */
export function polyline(points: { x: number; y: number }[]): string {
  return points
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${round(point.x)} ${round(point.y)}`)
    .join(' ')
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}

export function extent(values: number[], fallback: [number, number] = [0, 1]): [number, number] {
  if (values.length === 0) return fallback
  return [Math.min(...values), Math.max(...values)]
}
