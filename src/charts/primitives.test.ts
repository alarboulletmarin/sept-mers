import { describe, expect, it } from 'vitest'
import { extent, niceTicks, plotArea, polyline, scale } from './primitives.ts'

describe('graduations', () => {
  it('rend quatre repères ronds sur un intervalle courant', () => {
    expect(niceTicks(0, 100)).toEqual([0, 50, 100])
  })

  it('encadre un intervalle négatif', () => {
    const ticks = niceTicks(-90, 190)
    expect(ticks[0]).toBeLessThanOrEqual(-90)
    expect(ticks[ticks.length - 1]).toBeGreaterThanOrEqual(190)
  })

  it('rend un seul repère quand tout est plat', () => {
    expect(niceTicks(40, 40)).toEqual([40])
  })

  it('évite les résidus de virgule flottante', () => {
    for (const tick of niceTicks(-0.3, 0.3)) {
      expect(Number.isInteger(tick * 1e6)).toBe(true)
    }
  })
})

describe('échelle', () => {
  it('projette le domaine sur la plage', () => {
    const project = scale([0, 10], [0, 100])
    expect(project(0)).toBe(0)
    expect(project(5)).toBe(50)
    expect(project(10)).toBe(100)
  })

  it('inverse la plage pour un axe qui descend', () => {
    const project = scale([0, 10], [100, 0])
    expect(project(0)).toBe(100)
    expect(project(10)).toBe(0)
  })

  it('centre quand le domaine est plat', () => {
    expect(scale([5, 5], [0, 100])(5)).toBe(50)
  })
})

describe('tracé', () => {
  it('relie les points en segments droits', () => {
    expect(polyline([{ x: 0, y: 0 }, { x: 10, y: 5 }])).toBe('M0 0 L10 5')
  })

  it('rend une chaîne vide sans point', () => {
    expect(polyline([])).toBe('')
  })
})

describe('cadre', () => {
  it('retranche les marges', () => {
    expect(plotArea({ width: 100, height: 60, top: 5, right: 10, bottom: 15, left: 20 })).toEqual({
      x: 20,
      y: 5,
      width: 70,
      height: 40,
    })
  })
})

describe('étendue', () => {
  it('rend le minimum et le maximum', () => {
    expect(extent([3, -1, 7])).toEqual([-1, 7])
  })

  it('retombe sur la valeur par défaut si la série est vide', () => {
    expect(extent([], [0, 5])).toEqual([0, 5])
  })
})
