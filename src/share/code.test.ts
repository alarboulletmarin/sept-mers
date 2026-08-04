import { describe, expect, it } from 'vitest'
import { CODE_ALPHABET, CODE_LENGTH, newRoomCode, normaliseCode } from './code.ts'

describe('alphabet du code de table', () => {
  it('écarte ce qui se confond à voix haute ou à l écran', () => {
    for (const banned of ['I', 'L', 'O', '0', '1']) {
      expect(CODE_ALPHABET).not.toContain(banned)
    }
  })

  it('compte trente et un symboles, tous distincts', () => {
    // 26 lettres et 10 chiffres, moins les 5 qui se confondent.
    expect(CODE_ALPHABET).toHaveLength(31)
    expect(new Set(CODE_ALPHABET).size).toBe(31)
  })
})

describe('tirage d un code', () => {
  it('rend six symboles pris dans l alphabet', () => {
    for (let draw = 0; draw < 200; draw += 1) {
      const code = newRoomCode()
      expect(code).toHaveLength(CODE_LENGTH)
      for (const symbol of code) expect(CODE_ALPHABET).toContain(symbol)
    }
  })

  it('finit par visiter tout l alphabet', () => {
    // Le rejet des octets au-delà du plus grand multiple de 31 évite le biais
    // du modulo : si un symbole ne sortait jamais, c'est lui qu'on aurait
    // cassé.
    const seen = new Set<string>()
    for (let draw = 0; draw < 2000 && seen.size < CODE_ALPHABET.length; draw += 1) {
      for (const symbol of newRoomCode()) seen.add(symbol)
    }
    expect(seen.size).toBe(CODE_ALPHABET.length)
  })
})

describe('remise au propre d un code tapé', () => {
  it('remonte la casse et avale espaces et tirets', () => {
    expect(normaliseCode(' ab2-c3 d ')).toBe('AB2C3D')
    expect(normaliseCode('AB2C3D')).toBe('AB2C3D')
  })

  it('refuse tout ce qui n a pas six symboles', () => {
    expect(normaliseCode('')).toBeNull()
    expect(normaliseCode('AB2C3')).toBeNull()
    expect(normaliseCode('AB2C3DE')).toBeNull()
  })

  it('refuse les symboles hors alphabet plutôt que de deviner', () => {
    expect(normaliseCode('AB2C30')).toBeNull()
    expect(normaliseCode('AB2C3I')).toBeNull()
    expect(normaliseCode('AB2C3!')).toBeNull()
  })
})
