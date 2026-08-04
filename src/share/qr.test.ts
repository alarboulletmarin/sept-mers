import { describe, expect, it } from 'vitest'
import { qrData, qrPath } from './qr.ts'

describe('tracé du QR', () => {
  it('trace un carré par module sombre, rien pour les clairs', () => {
    const path = qrPath([
      [true, false],
      [false, true],
    ])
    expect(path).toBe('M0 0h1v1h-1zM1 1h1v1h-1z')
  })

  it('fait tenir une adresse de salle dans un petit code', () => {
    // Version 3 = 29 modules de côté, plus deux fois la zone de silence de 4.
    const qr = qrData('https://sept-mers.exemple/watch/AB2C3D')
    expect(qr).not.toBeNull()
    expect(qr && qr.size).toBeLessThanOrEqual(29 + 8)
  })

  it('fait tenir un lien-résumé au pire de la grille sous la version 22', () => {
    // En correction L : la version 22 y porte 1003 octets, quand `M` s'arrête
    // à 779 — trop court pour une grille de huit joueurs bien remplie.
    const qr = qrData(`https://sept-mers.exemple/recap#s=1.${'A'.repeat(860)}`, {
      maxVersion: 22,
      ecc: 'L',
    })
    expect(qr).not.toBeNull()
  })

  it('rend null plutôt qu un code qui ne se scanne plus', () => {
    expect(qrData('A'.repeat(3000), { maxVersion: 10 })).toBeNull()
  })
})
