import { useState } from 'react'
import { Icon } from '../components/Icon.tsx'
import { useT } from '../i18n/index.ts'
import { rulesEn } from './rules.en.ts'
import { rulesFr } from './rules.fr.ts'
import type { RuleSection } from './rulesTypes.ts'
import styles from './RulesBody.module.css'

function sectionsFor(locale: 'fr' | 'en'): RuleSection[] {
  return locale === 'en' ? rulesEn : rulesFr
}

/**
 * Sections repliables. Le rappel rapide en cours de partie ouvre d'abord la
 * hiérarchie des cartes, qui est la question posée dans presque tous les cas.
 */
export function RulesBody({ quickFirst = false }: { quickFirst?: boolean }) {
  const { locale } = useT()
  const sections = sectionsFor(locale)
  const ordered = quickFirst
    ? [...sections].sort((a, b) => Number(Boolean(b.quick)) - Number(Boolean(a.quick)))
    : sections

  const [open, setOpen] = useState<string[]>(() => {
    const first = ordered.find((section) => (quickFirst ? section.quick : true))
    return first ? [first.id] : []
  })

  const toggle = (id: string) =>
    setOpen((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    )

  return (
    <div className={styles.list}>
      {ordered.map((section) => {
        const expanded = open.includes(section.id)
        return (
          <section key={section.id} className={styles.section}>
            <h3>
              <button
                type="button"
                className={styles.header}
                aria-expanded={expanded}
                onClick={() => toggle(section.id)}
              >
                <span className="t-section">{section.title}</span>
                <Icon
                  name="chevron"
                  rotate={expanded ? 'up' : 'down'}
                  className="linkrow-chevron"
                />
              </button>
            </h3>
            {expanded && (
              <div className={styles.body}>
                {section.blocks.map((block, index) => {
                  if (block.kind === 'p') {
                    return (
                      <p key={index} className="t-body">
                        {block.text}
                      </p>
                    )
                  }
                  const items = block.items ?? []
                  return block.kind === 'ol' ? (
                    <ol key={index} className={styles.ordered}>
                      {items.map((item, position) => (
                        <li key={position} className="t-body">
                          {item}
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <ul key={index} className={styles.unordered}>
                      {items.map((item, position) => (
                        <li key={position} className="t-body">
                          {item}
                        </li>
                      ))}
                    </ul>
                  )
                })}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}
