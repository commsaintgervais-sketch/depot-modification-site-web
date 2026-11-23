# Demandes web — Saint-Gervais Mont-Blanc

Application mobile et ordinateur pour les agents : formulaire en quatre étapes, pièces jointes privées, espace de gestion, traitement et rapport hebdomadaire. React + Vite, Netlify Functions, Netlify Database pour les demandes et Netlify Blobs pour les fichiers.

## Mise en ligne depuis GitHub

1. Déposer les fichiers de ce projet à la racine du dépôt GitHub.
2. Dans Netlify, importer ce dépôt et choisir la branche de production. `netlify.toml` renseigne la compilation (`npm run build`) et le dossier publié (`dist`).
3. Dans les variables d’environnement Netlify, ajouter `ADMIN_CODE` avec le code demandé **4807** et `SESSION_SECRET` avec une chaîne aléatoire d’au moins 32 caractères. Portée : Functions. Ne pas ajouter ces secrets dans le code ou les variables VITE.
4. Déployer. Le paquet `@netlify/database` et la migration du dossier `netlify/database/migrations` permettent le provisionnement de la base sur les offres Netlify compatibles. Vérifier sa disponibilité dans Data & Storage.
5. Tester une demande, son fichier et la connexion à l’espace de gestion avant de diffuser le lien aux agents.

Exemple de génération d’un secret : `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

Le code n’est jamais inclus dans le JavaScript public. La connexion utilise un cookie signé HttpOnly/Secure de 8 heures et une limite de 5 tentatives par adresse IP sur 15 minutes. Le code à quatre chiffres reste un accès partagé : ne diffuser qu’aux personnes chargées de la gestion.

## E-mails sans service à configurer

L’agent indique obligatoirement son adresse. Après « Marquer comme traitée », le bouton « Prévenir l’agent par e-mail » ouvre la messagerie de l’administrateur avec destinataire, objet et texte préremplis. **L’administrateur doit cliquer sur Envoyer dans sa messagerie.** Aucun envoi automatique ou accusé de livraison n’est prétendu. Une messagerie configurée sur l’appareil est nécessaire. Les notifications de traitement restent manuelles. Les nouveaux dépôts Apidae peuvent déclencher une notification native Netlify Forms, décrite ci-dessous.

## Fichiers et rapports

- Jusqu’à cinq fichiers par demande, chacun limité à 4 Mo : PDF, JPG, PNG, WebP, GIF, MP4, MOV, WebM. Pour les vidéos lourdes, un champ de lien de partage est prévu. Cette limite permet de rester sous la limite de charge utile des fonctions Netlify.
- Les fichiers ne sont consultables que par une session administrateur. Une demande reste enregistrée si l’envoi d’un fichier échoue ; l’écran propose de réessayer ces fichiers pendant 30 minutes.
- Le rapport contient les demandes selon leur **date de traitement**, avec dates civiles de Paris. Choisir le lundi souhaité : la période couvre sept jours inclusifs.
- Export CSV compatible Excel et impression PDF depuis le navigateur. Le PDF ou le CSV peut être joint à l’e-mail adressé au Maire. Aucun envoi programmé n’est activé.
- Les données de production persistent après les déploiements. Les stores de fichiers des prévisualisations sont isolés ; leurs pièces jointes ne sont pas les fichiers de production.

## Développement et vérification

Node 24 recommandé. `npm ci`, `npm test`, `npm run build`.

`npm run dev` prévisualise uniquement l’interface. Pour les fonctions et le stockage : Netlify CLI récent, `netlify dev`, puis `netlify database migrations apply` pour la base locale. Fournir ADMIN_CODE et SESSION_SECRET via un `.env` local ignoré. Ne jamais appliquer manuellement les migrations contre la production : les déploiements les gèrent.

## Budget et exploitation

Le projet vise une petite utilisation municipale sur Netlify Free compatible avec Database. Hébergement, fonctions, base et stockage consomment les quotas/crédits Netlify ; la gratuité illimitée n’est pas garantie. Contrôler l’utilisation dans Netlify, notamment pour les vidéos. Pas d’abonnement ni clé de service e-mail requis.

Les coordonnées et fichiers sont utilisés pour le traitement interne. Avant ouverture, définir avec la commune la durée de conservation et les modalités de suppression des données. Aucun outil analytique publicitaire n’est ajouté.

## Charte, services et suppression

La palette est centralisée dans les variables CSS : bleu `#072551`, blanc `#ffffff`, orange `#E18943`, texte `#272727`.

Le champ Service propose les principaux services municipaux. « Ajouter un nouveau service » permet d’en saisir un autre ; il rejoint la liste commune après l’envoi réussi de la demande. La liste est conservée en base, même si une demande est supprimée. Les services déjà présents dans les demandes sont repris par la nouvelle migration. Les variantes de casse et d’espaces sont regroupées à l’envoi.

Dans l’administration, le filtre Service s’applique aux demandes, compteurs et rapports (CSV/PDF). Un tri alphabétique par service est également disponible.

La fiche d’une demande comporte « Supprimer la demande », puis une confirmation explicite. Cette action retire définitivement la demande et ses pièces jointes, et l’exclut des rapports futurs. En cas d’échec du stockage, la demande reste disponible pour réessayer la suppression ; certains fichiers peuvent déjà avoir été retirés. L’API vérifie la session administrateur et l’origine de la requête.

La migration `20261120140000_services.sql` doit être appliquée par le déploiement Netlify avant utilisation de cette version. Aucune variable d’environnement supplémentaire n’est requise.

Les tests et la compilation sont exécutés par GitHub Actions à chaque push.

## Classement Apidae / Site Web

Le back-office classe automatiquement les demandes à partir de l’URL, y compris les anciennes demandes. Les pages de `saintgervais.com` ou `www.saintgervais.com` dont le chemin se termine par `fr-<numéro>` (avec ou sans slash final) sont indiquées **Apidae**, quelle que soit la rubrique. Les autres sont indiquées **Site Web**. Les paramètres et ancres n’influencent pas le classement. Le numéro de fiche est extrait de ce suffixe.

La liste affiche séparément l’outil de modification, l’identifiant Apidae et le statut de traitement. Le détail indique où réaliser la modification. Les filtres par outil, service et statut se combinent ; la recherche accepte aussi l’URL ou l’identifiant. Les compteurs par outil portent sur le service sélectionné. Les rapports CSV/PDF respectent les filtres de service et d’outil et mentionnent la destination de modification.

Ce classement ne modifie ni le formulaire ni les données historiques et ne nécessite aucune migration ou nouvelle variable d’environnement. Il n’envoie aucune modification directement à Apidae.

## Références et notifications Apidae natives

La référence du reçu (8 premiers caractères de l’UUID, en majuscules) apparaît dans la liste, le détail et les rapports. La recherche accepte cette référence ou l’UUID complet, disponible au survol de la référence dans le détail. Les anciennes demandes conservent leur référence.

Pour activer les notifications sans service externe :
1. Dans le projet Netlify `depot-site-saint-gervais`, ouvrir Forms et activer **Enable form detection**.
2. Redéployer pour que `public/__forms.html` enregistre le formulaire `apidae-recap`.
3. Dans Forms > Submission notifications > Add notification, choisir Email, le formulaire **apidae-recap** uniquement et **assistantot@saintgervais.com**.
4. Si Netlify demande de confirmer l’adresse destinataire, cliquer le lien reçu. Selon le déploiement de cette fonctionnalité sur le compte, Netlify peut encore exiger un membre actif de l’équipe. Ne pas déclarer l’envoi actif avant validation du réglage.

Après enregistrement du dépôt et tentative d’envoi des fichiers, le navigateur transmet le récapitulatif des demandes Apidae à Netlify Forms. Il contient référence, fiche Apidae, demande, coordonnées, commentaire, lien de partage, noms des fichiers effectivement transmis et lien vers le back-office. Les fichiers privés ne sont pas copiés dans Forms. Les demandes Site Web ne déclenchent pas ce récapitulatif.

Une erreur de transmission affiche un avertissement avec un bouton pour réessayer le récapitulatif seul, sans recréer la demande. Il n’y a pas de file d’attente durable : fermeture de la page ou perte de connexion peuvent empêcher la transmission. Un délai d’attente peut aussi masquer un succès ; réessayer peut créer un doublon portant la même référence. L’acceptation par Forms ne prouve pas la livraison de l’e-mail : vérifier les soumissions vérifiées/spam et le réglage de notification. Les anciens dépôts ne sont pas réexpédiés.

Supprimer une demande dans l’application ne supprime pas sa copie textuelle dans Netlify Forms ni l’e-mail déjà reçu. Gérer leur conservation séparément. Aucune variable d’environnement d’e-mail n’est nécessaire.
