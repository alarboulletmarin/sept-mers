/**
 * La sortie d'un fichier hors de l'app : le disque, ou la feuille de partage
 * du système — AirDrop, Partage à proximité, une messagerie.
 *
 * Deux sorties pour un même fichier, et toujours rien qui passe par un serveur
 * de l'app : c'est le navigateur qui remet les octets à l'appareil d'en face.
 *
 * **Rien d'asynchrone avant `share()`.** L'API exige une activation
 * transitoire : le navigateur n'ouvre la feuille que si l'appel appartient
 * encore à la tâche du clic. Un `await` glissé au-dessus la consomme, et Safari
 * iOS — lui seul, ce qui rend la panne indétectable ailleurs — lève alors
 * `NotAllowedError`. D'où la chaîne de promesses plutôt qu'une fonction
 * `async` : celle-ci ne *peut* pas attendre quoi que ce soit avant d'appeler.
 *
 * **La disponibilité se demande à `canShare`, jamais à `'share' in
 * navigator`.** Les navigateurs filtrent les types partageables, et
 * `application/json` n'est pas sur toutes les listes blanches : la présence de
 * l'API ne dit rien de ce fichier-là.
 */

/** Ce qu'a donné la feuille. Fermer n'est pas rater — voir `shareFile`. */
export type ShareResult = 'shared' | 'dismissed' | 'failed'

/**
 * La fermeture de la feuille, que le navigateur rejette en `AbortError`.
 *
 * Le nom seul, sans `instanceof` : une `DOMException` ne descend pas d'`Error`
 * dans tous les contextes, et un test d'appartenance qui échoue là
 * transformerait un renoncement en échec.
 */
function isDismissal(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('name' in error)) return false
  return error.name === 'AbortError'
}

/**
 * Vrai si un fichier de ce nom et de ce type peut partir.
 *
 * La sonde est un fichier **vide** : `canShare` ne regarde que le nom et le
 * type, et sérialiser toutes les données pour répondre à une question
 * d'affichage coûterait cher pour rien. Elle porte la même forme de charge que
 * l'envoi — `files` seul — sans quoi elle validerait autre chose que ce qui
 * partira.
 */
export function canShareFile(filename: string, type: string): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.canShare !== 'function') return false
  try {
    return navigator.canShare({ files: [new File([], filename, { type })] })
  } catch {
    return false
  }
}

/**
 * Ouvre la feuille, et dit ce qu'il en est ressorti.
 *
 * `dismissed` quand elle a été fermée sans rien choisir : ce n'est pas une
 * erreur — l'appelant ne doit ni s'en excuser ni compter l'envoi comme fait.
 * Tout autre rejet est un `failed`, où il reste le téléchargement.
 */
export function shareFile(file: File): Promise<ShareResult> {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
    return Promise.resolve('failed')
  }
  return navigator
    .share({ files: [file] })
    .then((): ShareResult => 'shared')
    .catch((error: unknown): ShareResult => (isDismissal(error) ? 'dismissed' : 'failed'))
}

/**
 * L'autre sortie : le disque, qui ne rate pas.
 *
 * Deux précautions qui n'en ont pas l'air, sur le seul chemin qui sort les
 * données de ce navigateur.
 *
 * **L'ancre est posée dans le document.** Un `click()` sur un élément détaché
 * marche sur Chrome et pas ailleurs : Firefox n'a longtemps rien fait d'un
 * lien qui n'est pas dans l'arbre. Elle est retirée dans la foulée, donc rien
 * ne se voit.
 *
 * **La révocation est différée.** Le clic déclenche un téléchargement que le
 * navigateur poursuit *après* le retour du gestionnaire ; révoquer l'adresse à
 * la ligne suivante coupe la source sous Safari, qui rend alors un fichier
 * vide. Un tour de boucle suffit, et le blob finit quand même libéré.
 */
export function downloadFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.rel = 'noopener'
  link.style.display = 'none'
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => {
    URL.revokeObjectURL(url)
  }, 0)
}
