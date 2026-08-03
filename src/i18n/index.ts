import { createContext, useContext } from 'react'
import type { Locale } from '../domain/types.ts'
import fr from './fr.json'
import en from './en.json'

export type Dict = Record<string, string>

export const dictionaries: Record<Locale, Dict> = { fr, en }

export type Vars = Record<string, string | number>

/** Remplace les `{jetons}` d'un modèle par leurs valeurs. */
function fill(template: string, vars?: Vars): string {
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match,
  )
}

const pluralRules = new Map<Locale, Intl.PluralRules>()

function ruleFor(locale: Locale): Intl.PluralRules {
  let rules = pluralRules.get(locale)
  if (!rules) {
    rules = new Intl.PluralRules(locale)
    pluralRules.set(locale, rules)
  }
  return rules
}

/**
 * Les pluriels sont gérés à la main : une clé de base et une variante `…One`,
 * choisies par `Intl.PluralRules`. Deux formes suffisent au français comme à
 * l'anglais pour les quantités que l'app manipule.
 */
export function translate(dict: Dict, locale: Locale, key: string, vars?: Vars): string {
  if (vars && typeof vars.count === 'number') {
    const category = ruleFor(locale).select(vars.count)
    if (category === 'one') {
      const singular = dict[`${key}One`]
      if (singular) return fill(singular, vars)
    }
  }
  const template = dict[key]
  // Une clé absente s'affiche telle quelle : visible en développement,
  // inoffensif à table.
  return template === undefined ? key : fill(template, vars)
}

export interface I18n {
  locale: Locale
  t: (key: string, vars?: Vars) => string
  /** Formate un nombre signé : `+60`, `−20`. Le signe moins est typographique. */
  signed: (value: number) => string
  number: (value: number) => string
  percent: (ratio: number) => string
  date: (iso: string) => string
}

export const I18nContext = createContext<I18n | null>(null)

export function useT(): I18n {
  const context = useContext(I18nContext)
  if (!context) throw new Error('useT hors de I18nProvider')
  return context
}

const MINUS = '−' // signe moins, plus large que le trait d'union

export function makeI18n(locale: Locale): I18n {
  const dict = dictionaries[locale]
  const numberFormat = new Intl.NumberFormat(locale)
  const dateFormat = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return {
    locale,
    t: (key, vars) => translate(dict, locale, key, vars),
    number: (value) => numberFormat.format(value),
    signed: (value) =>
      value < 0 ? `${MINUS}${numberFormat.format(Math.abs(value))}` : `+${numberFormat.format(value)}`,
    percent: (ratio) => `${Math.round(ratio * 100)} %`,
    date: (iso) => {
      const parsed = new Date(iso)
      return Number.isNaN(parsed.getTime()) ? iso : dateFormat.format(parsed)
    },
  }
}
