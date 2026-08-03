/**
 * Les libellés d'un graphique vivent dans le `viewBox` : un nom trop long
 * déborde du cadre au lieu de s'y plier. On le raccourcit à la source, et le
 * nom entier reste dans la table de données en lecture d'écran seule.
 */
const MAX = 8

export function shorten(name: string, max = MAX): string {
  const trimmed = name.trim()
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, max - 1)}…`
}
