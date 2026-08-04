/**
 * Le code de table : six caractères à lire à voix haute d'un téléphone à
 * l'autre. L'alphabet écarte ce qui se confond — I, L, O, 0 et 1 — pour qu'un
 * code s'épelle sans hésiter, en lettres comme en chiffres. Il en reste
 * trente et un.
 */
export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
export const CODE_LENGTH = 6

/**
 * Le plus grand multiple de la taille de l'alphabet qui tient dans un octet.
 * Garder un octet au-delà biaiserait le modulo vers le début de l'alphabet :
 * on rejette l'octet et on retire.
 */
const UNBIASED_LIMIT = 256 - (256 % CODE_ALPHABET.length)

/**
 * Un code neuf, au hasard cryptographique. Trente et un symboles sur six
 * positions font près de 2^30 codes : assez pour un rendez-vous qui ne vit
 * que le temps d'une partie, et dont le code est le seul secret.
 */
export function newRoomCode(): string {
  const symbols: string[] = []
  while (symbols.length < CODE_LENGTH) {
    const bytes = new Uint8Array(CODE_LENGTH * 2)
    crypto.getRandomValues(bytes)
    for (const byte of bytes) {
      if (byte >= UNBIASED_LIMIT || symbols.length >= CODE_LENGTH) continue
      symbols.push(CODE_ALPHABET[byte % CODE_ALPHABET.length])
    }
  }
  return symbols.join('')
}

/**
 * Un code tapé à la main, remis au propre : majuscules, sans espaces ni
 * tirets. Rend `null` plutôt qu'une devinette quand ce n'en est pas un —
 * l'écran de saisie nomme alors ce qu'il attend.
 */
export function normaliseCode(raw: string): string | null {
  const cleaned = raw.toUpperCase().replace(/[\s-]/g, '')
  if (cleaned.length !== CODE_LENGTH) return null
  for (const symbol of cleaned) {
    if (!CODE_ALPHABET.includes(symbol)) return null
  }
  return cleaned
}
