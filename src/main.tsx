import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App.tsx'
import './styles/tokens.css'
import './styles/fonts.css'
import './styles/base.css'

/*
 * Safari iOS n'applique `:active` que si la page écoute le tactile quelque
 * part. Sans cet écouteur vide, aucun bouton ne s'enfonce sous le doigt : les
 * styles d'appui existent, ils ne se déclenchent jamais, et l'app donne
 * l'impression de répondre en retard alors qu'elle a déjà répondu.
 */
document.addEventListener('touchstart', () => {}, { passive: true })

const container = document.getElementById('root')
if (container) {
  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

// Le service worker précache le shell. L'app ne fait aucun appel réseau :
// une fois le shell en cache, il n'y a rien d'autre à gérer.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      // Hors ligne ou contexte non sécurisé : l'app marche quand même.
    })
  })
}
