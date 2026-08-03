import { Screen } from '../app/Layout.tsx'
import type { Route } from '../app/Router.tsx'
import { RulesBody } from '../content/RulesBody.tsx'
import { useT } from '../i18n/index.ts'

export function Rules({ go }: { go: (route: Route) => void }) {
  const { t } = useT()
  return (
    <Screen title={t('rules.title')} onBack={() => go({ name: 'home' })}>
      <RulesBody />
      <p className="t-caption muted">{t('about.rulesRewritten')}</p>
    </Screen>
  )
}
