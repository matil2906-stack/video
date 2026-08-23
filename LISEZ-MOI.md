# VidéoPrivée — mode d'emploi

Un mini-site pour envoyer des vidéos à un ami, sans perte de qualité (aucune vidéo n'est recompressée), avec un compte (pseudo + mot de passe) pour chacun.

## 1. Lancer le site sur ton ordinateur (le plus simple pour tester)

Il te faut **Node.js** installé (télécharge-le sur https://nodejs.org si besoin, prends la version "LTS").

Ensuite, dans un terminal, place-toi dans ce dossier et tape :

```
npm install
node server.js
```

Le site est alors accessible sur ton ordinateur à l'adresse : http://localhost:3000

⚠️ Ça, c'est seulement accessible depuis TON ordinateur. Pour que ton ami y accède aussi depuis chez lui, il faut le mettre en ligne (étape 2).

## 2. Mettre le site en ligne pour que toi ET ton ami puissiez l'utiliser

La solution la plus simple et gratuite : **Render.com**

1. Crée un compte gratuit sur https://render.com
2. Mets ce dossier dans un dépôt GitHub (ou dis-moi si tu veux, je peux t'aider à faire ça)
3. Sur Render, clique sur "New" → "Web Service", connecte ton dépôt GitHub
4. Render détecte automatiquement Node.js. Mets comme commande de démarrage : `node server.js`
5. Une fois déployé, Render te donne une adresse du style `https://tonsite.onrender.com` — c'est ce lien que tu partages avec ton ami

Autres hébergeurs gratuits qui marchent pareil : Railway.app, Fly.io.

## 3. Comment ça marche

- Chacun crée un compte (pseudo + mot de passe) — la première fois qu'on ouvre le site
- Onglet "Envoyer" : tu tapes le pseudo de ton ami + tu choisis ta vidéo → elle part directement dans sa boîte de réception
- Onglet "Reçues" : les vidéos qu'on t'a envoyées, avec un bouton "Regarder"
- Onglet "Envoyées" : ce que tu as envoyé
- Les vidéos sont stockées telles quelles sur le serveur, sans aucune compression : la qualité ne bouge pas
- Seuls l'expéditeur et le destinataire d'une vidéo peuvent la voir (personne d'autre)

## Notes importantes

- Les mots de passe sont chiffrés (jamais stockés en clair)
- Taille maximale par vidéo : 2 Go (modifiable dans `server.js`, ligne `fileSize`)
- Avant de mettre le site en ligne pour de vrai, change la ligne suivante dans `server.js` :
  ```
  secret: 'change-cette-cle-secrete-avant-de-deployer',
  ```
  par une phrase secrète longue et unique à toi.
- Les vidéos sont stockées dans le dossier `uploads/` et la liste des comptes/vidéos dans `data/app.db`.
