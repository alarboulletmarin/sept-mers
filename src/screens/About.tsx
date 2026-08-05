import { Screen } from '../app/Layout.tsx'
import { hrefFor, opensElsewhere, type Route } from '../app/Router.tsx'
import { useInstall } from '../app/useInstall.ts'
import { Button } from '../components/Button.tsx'
import { Icon } from '../components/Icon.tsx'
import { HowItWorks } from '../content/HowItWorks.tsx'
import { useT } from '../i18n/index.ts'
import styles from './About.module.css'

/**
 * L'adresse du code, une bonne fois : l'app est libre, elle doit le dire.
 *
 * Ce lien n'est pas décoratif depuis le passage sous AGPL-3.0. Un front seul ne
 * se distribue pas, il se visite — et c'est exactement le cas que couvre le §13,
 * qui demande que l'utilisateur atteint par le réseau puisse atteindre la source.
 * Retirer ce lien rendrait le déploiement non conforme.
 */
export const SOURCE_URL = 'https://github.com/alarboulletmarin/sept-mers'

/**
 * Le fichier que le build écrit à côté du bundle : les licences de tout ce
 * qui est embarqué, dépendances et fontes comprises. C'est ce qui rend la
 * distribution conforme, et ce lien est ce qui la rend consultable.
 */
export const LICENSES_URL = '/licenses.txt'

/**
 * À propos, et surtout : comment ça marche.
 *
 * L'app expliquait ce qu'elle faisait à un seul moment — le tout premier
 * lancement, sur l'accueil, avant la première partie. Passé ce moment,
 * l'explication n'existait plus nulle part. Cet écran est celui qu'on ouvre
 * quand on prête son téléphone à quelqu'un qui n'a jamais joué, et il est
 * atteignable de partout, tout le temps.
 *
 * Il porte aussi ce qu'un site doit publier et que l'app taisait : l'éditeur
 * et l'hébergeur, la licence du code, celle des fontes embarquées, et où
 * trouver la source.
 */
export function About({ go }: { go: (route: Route) => void }) {
  const { t } = useT()
  const install = useInstall()

  return (
    <Screen title={t('about.title')} lede={t('about.lede')} onBack={() => go({ name: 'home' })}>
      <section className="stack-tight">
        <h2 className="section-title">{t('home.how.title')}</h2>
        <HowItWorks />
        <a
          className={styles.link}
          href={hrefFor({ name: 'rules' })}
          onClick={(event) => {
            if (opensElsewhere(event)) return
            event.preventDefault()
            go({ name: 'rules' })
          }}
        >
          <Icon name="book" size={16} />
          {t('home.how.rules')}
        </a>
      </section>

      <section className="stack-tight">
        <h2 className="section-title">{t('about.what.title')}</h2>
        <p className="t-body">{t('about.what')}</p>
        <p className="t-body">{t('about.offline')}</p>
      </section>

      {/*
        L'installation. Une app hors ligne d'abord qui vit dans un onglet se
        perd au premier ménage de navigateur ; installée, elle est là quand le
        téléphone passe de main en main, y compris en mode avion.
       */}
      {install.state !== 'none' && (
        <section className="stack-tight">
          <h2 className="section-title">{t('about.install.title')}</h2>
          {install.state === 'installed' ? (
            <p className="t-body">{t('about.install.done')}</p>
          ) : install.state === 'ready' ? (
            <>
              <p className="t-body">{t('about.install.body')}</p>
              <Button variant="primary" onClick={install.install}>
                {t('about.install.action')}
              </Button>
            </>
          ) : (
            <>
              <p className="t-body">{t('about.install.body')}</p>
              {/* Safari n'expose aucune invite : le geste s'écrit. */}
              <p className={styles.note}>{t('about.install.ios')}</p>
            </>
          )}
        </section>
      )}

      <section className="stack-tight">
        <h2 className="section-title">{t('about.privacy.title')}</h2>
        <p className="t-body">{t('about.privacy')}</p>
        <p className={styles.note}>{t('about.privacy.share')}</p>
        <p className={styles.note}>{t('about.privacy.host')}</p>
      </section>

      {/*
        L'app est libre, et le disait seulement dans son dépôt. Le lien vers la
        source est ce qui rend la licence utile à qui lit l'app plutôt que le
        code — et, sous AGPL, ce qui satisfait le §13 pour un site qu'on visite
        sans rien télécharger. Le fichier des licences tierces, lui, est ce qui
        rend la distribution conforme au MIT de ce qu'elle embarque.

        La mention du contenu est distincte de celle du code, parce que les deux
        ne relèvent pas de la même licence : le texte des règles est aussi
        disponible sous CC BY-SA 4.0.
       */}
      <section className="stack-tight">
        <h2 className="section-title">{t('about.source.title')}</h2>
        <p className="t-body">{t('about.source')}</p>
        <a className={styles.link} href={SOURCE_URL} target="_blank" rel="noreferrer">
          <Icon name="chevron" size={16} />
          {t('about.source.link')}
        </a>
        <a className={styles.link} href={LICENSES_URL} target="_blank" rel="noreferrer">
          <Icon name="chevron" size={16} />
          {t('about.licenses.link')}
        </a>
        <p className={styles.note}>{t('about.content')}</p>
        <p className={styles.note}>{t('about.fonts')}</p>
      </section>

      <section className="stack-tight">
        <h2 className="section-title">{t('about.legal.title')}</h2>
        <p className={styles.note}>{t('about.publisher')}</p>
        <p className={styles.note}>{t('about.host')}</p>
        <hr className={styles.divider} />
        <p className={styles.note}>{t('about.trademark')}</p>
        <p className={styles.note}>{t('about.rulesRewritten')}</p>
        <p className={styles.note}>{t('about.version', { version: APP_VERSION })}</p>
      </section>
    </Screen>
  )
}
