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

// L'enregistrement du service worker n'est pas ici : il se fait dans
// `UpdatePrompt`, qui a besoin de la même inscription pour savoir qu'une
// version attend. Deux points d'entrée pour un seul worker, et le bandeau ne
// verrait jamais rien venir.
