# Sécurité

## Ce que l'app manipule

Sept Mers n'a ni compte, ni serveur, ni base de données. Les parties vivent
dans le `localStorage` du navigateur et n'en sortent que par un export
déclenché à la main.

La seule exception est le **partage de table**, qui ne s'ouvre qu'à la main :
l'état de la partie circule alors de téléphone à téléphone, chiffré de bout en
bout par WebRTC. La mise en relation passe par des relais Nostr publics, qui
voient les adresses des pairs sans voir la partie. Le code de salle est le seul
secret, et il ne vit que le temps d'une partie.

## Signaler une faille

Ouvrez un **avis de sécurité privé** depuis l'onglet Security du dépôt
(« Report a vulnerability »). N'ouvrez pas d'issue publique tant que la faille
n'est pas corrigée.

Réponse sous une semaine. Le projet est tenu sur du temps libre : ce n'est pas
un engagement contractuel, c'est une intention sincère.

## Ce qui nous intéresse particulièrement

- Tout ce qui permettrait à un état reçu par le partage de table d'échapper à
  `normalise` — le relecteur défensif de `src/store/storage.ts`, par lequel
  passe tout ce qui vient d'ailleurs, fichier importé comme message reçu.
- Tout ce qui ferait sortir des données du navigateur sans geste explicite.
- Tout lien-résumé qui ferait autre chose que s'afficher.

## Ce qui n'en est pas

- Un fichier d'import bricolé à la main qui casse **sa propre** installation.
- Le fait que le code de salle soit court : il est éphémère, et c'est un
  rendez-vous, pas un coffre.
