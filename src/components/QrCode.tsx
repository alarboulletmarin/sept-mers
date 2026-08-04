import { useMemo, type ReactNode } from 'react'
import { qrData, type QrOptions } from '../share/qr.ts'
import styles from './QrCode.module.css'

interface QrCodeProps extends QrOptions {
  value: string
  /** Ce que le code contient, lu par les technologies d'assistance. */
  label: string
  /** Rendu à la place du code quand le contenu ne tient pas dans la version. */
  fallback?: ReactNode
}

/**
 * Un QR en SVG, tracé maison sur la matrice de `uqr`. Modules sombres sur
 * boîte blanche dans les deux thèmes : un code inversé se scanne mal, c'est
 * la seule surface de l'app qui ne suit pas le thème — le thème sombre lui
 * pose un filet pour la détacher du fond.
 *
 * Rend `null` quand le contenu ne tient pas dans la version demandée :
 * l'appelant montre alors le lien, et le dit.
 */
export function QrCode({ value, label, maxVersion, ecc, fallback }: QrCodeProps) {
  const qr = useMemo(() => qrData(value, { maxVersion, ecc }), [value, maxVersion, ecc])
  if (!qr) return fallback ?? null

  return (
    <svg
      className={styles.qr}
      viewBox={`0 0 ${qr.size} ${qr.size}`}
      role="img"
      aria-label={label}
      shapeRendering="crispEdges"
    >
      <rect width={qr.size} height={qr.size} fill="#FFFFFF" />
      <path d={qr.path} fill="#0F0F0F" />
    </svg>
  )
}
