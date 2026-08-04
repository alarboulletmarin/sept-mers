import { encode } from 'uqr'

/**
 * La zone de silence : quatre modules blancs tout autour, la règle du format.
 * Elle entre dans la matrice via l'option `border`, pour que la boîte blanche
 * du rendu la couvre sans calcul de marge.
 */
const QUIET_ZONE = 4

export interface QrData {
  /** Côté de la matrice, zone de silence comprise. */
  size: number
  /** Un seul tracé SVG : un `M x y h1v1h-1z` par module sombre. */
  path: string
}

export function qrPath(matrix: boolean[][]): string {
  let path = ''
  matrix.forEach((row, y) => {
    row.forEach((dark, x) => {
      if (dark) path += `M${x} ${y}h1v1h-1z`
    })
  })
  return path
}

export interface QrOptions {
  /** Au-delà, un QR d'écran ne se scanne plus du premier coup. */
  maxVersion?: number
  /**
   * Correction d'erreur. `M` par défaut ; `L` pour le lien-résumé, dont le
   * canal — un écran propre devant une caméra — n'abîme rien, et dont la
   * charge ne tiendrait pas sous `M` au pire de la grille.
   */
  ecc?: 'L' | 'M'
}

/**
 * La matrice d'un code, prête à tracer. `uqr` calcule la matrice, le rendu
 * SVG reste maison. Rend `null` quand le contenu ne tient pas dans la version
 * demandée : plutôt le lien seul qu'un QR géant qui ne se scanne plus.
 */
export function qrData(value: string, options: QrOptions = {}): QrData | null {
  try {
    const { size, data } = encode(value, {
      ecc: options.ecc ?? 'M',
      border: QUIET_ZONE,
      ...(options.maxVersion ? { maxVersion: options.maxVersion } : {}),
    })
    return { size, path: qrPath(data) }
  } catch {
    return null
  }
}
