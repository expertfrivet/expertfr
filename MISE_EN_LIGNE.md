# Mettre l'appli téléphone en ligne

L'appli téléphone est une simple page web qui s'installe sur l'écran d'accueil et marche ensuite sans réseau. Il faut la déposer une fois sur Internet (gratuit), créer un « identifiant client Google » pour qu'elle puisse écrire dans le dossier Drive, puis la régler sur le téléphone.

Comptez 20 minutes. Faites les étapes dans l'ordre.

---

## Étape 1 : déposer l'appli sur GitHub Pages (gratuit)

1. Allez sur **github.com**. Créez un compte gratuit si vous n'en avez pas. Retenez votre **nom d'utilisateur** : on l'appellera `PSEUDO`.
2. En haut à droite, cliquez **+** puis **New repository**.
   - Repository name : `expertfr`
   - Cochez **Public**. C'est obligatoire pour la version gratuite. Ce n'est pas un problème : seul le code de l'appli est publié, jamais les fiches clients, qui restent dans le téléphone et dans votre Drive.
   - Cliquez **Create repository**.
3. Sur la page qui s'affiche, cliquez le lien **uploading an existing file**.
4. Glissez dans la page ces 9 fichiers du dossier `mobile` (ou du zip `expertfr_mobile.zip`) :
   - `index.html`
   - `app.js`
   - `dictee.js`
   - `photos.js`
   - `data.js`
   - `sw.js`
   - `manifest.webmanifest`
   - `icon-192.png`
   - `icon-512.png`

   Cliquez ensuite **Commit changes**.
5. Allez dans **Settings** (onglet du dépôt), puis **Pages** dans le menu de gauche.
   - Source : **Deploy from a branch**
   - Branch : **main**, dossier **/ (root)**
   - Cliquez **Save**.
6. Attendez 1 à 2 minutes et rafraîchissez la page. L'adresse de l'appli apparaît en haut : **https://PSEUDO.github.io/expertfr/**. Notez-la.

## Étape 2 : créer l'identifiant client Google

Faites-le dans le **même projet Google Cloud** que le compte de service. L'API Drive y est déjà activée.

1. Allez sur **console.cloud.google.com** et vérifiez en haut que c'est bien le bon projet.
2. Dans le menu ☰, ouvrez **API et services**, puis **Écran de consentement OAuth** (parfois appelé « Google Auth Platform »).
   - S'il demande de configurer l'appli :
     - Nom de l'application : `ExpertFR`
     - Adresse e-mail d'assistance : la vôtre
     - Type d'utilisateur ou audience : **Externe**
     - Coordonnées du développeur : votre adresse
     - Acceptez puis **Créer**.
   - Dans **Audience**, laissez le statut **En test**.
   - Toujours dans **Audience**, sous **Utilisateurs test**, cliquez **+ Add users** et ajoutez :
     - l'adresse Gmail que votre père utilise sur son téléphone ;
     - la vôtre si vous voulez tester.
3. Allez dans **Clients**, puis **+ Créer un client**.
   - Type d'application : **Application Web**
   - Nom : `ExpertFR mobile`
   - **Origines JavaScript autorisées**, cliquez **+ Ajouter un URI** et saisissez exactement `https://PSEUDO.github.io`. Ne mettez rien après : ni `/expertfr`, ni `/` à la fin.
   - Laissez les URI de redirection vides.
   - Cliquez **Créer**.
4. Copiez l'**ID client**, qui finit par `.apps.googleusercontent.com`. Il n'y a pas besoin du « code secret ».

## Étape 3 : donner au téléphone l'accès au dossier Drive

Le téléphone se connecte avec le compte Google de votre père, et ce compte doit pouvoir modifier le dossier Drive de l'appli.

- Si le dossier est dans **le Drive de votre père**, il n'y a rien à faire.
- Si le dossier est dans **votre Drive** :
  1. Ouvrez Drive et faites un clic droit sur le dossier.
  2. Choisissez **Partager**.
  3. Ajoutez l'adresse Gmail de votre père en tant qu'**Éditeur**.

## Étape 4 : régler le téléphone

1. Sur le téléphone de votre père, ouvrez **Chrome** et allez sur `https://PSEUDO.github.io/expertfr/`.
2. Touchez **⚙️ Réglages** en bas :
   - **Dossier Google Drive** : collez le lien du dossier, celui que vous copiez dans Drive avec « Partager », puis « Copier le lien ».
   - **Identifiant client Google** : collez l'ID client de l'étape 2.
3. Touchez **🔄 Se connecter et synchroniser** :
   - choisissez le compte Google de votre père ;
   - Google affiche « Google n'a pas validé cette application ». C'est normal en mode test : touchez **Continuer** ;
   - acceptez l'accès à Google Drive.
4. La première synchro crée le fichier `expertfr_clients.json` dans le dossier Drive. Le PC ne peut pas le créer lui-même : c'est une limite des comptes Gmail personnels.
5. Installez l'appli sur l'écran d'accueil : dans Chrome, touchez le menu **⋮**, puis **Ajouter à l'écran d'accueil** (ou **Installer l'application**).

## Étape 5 : premier envoi des fiches du PC

1. Recopiez sur le PC les fichiers mis à jour : `app.py`, `src/services/client_storage.py`, `src/services/drive_sync.py` (nouveau), `src/services/transcription.py` (nouveau), `requirements.txt` et `lancer.bat`.
2. Lancez le logiciel. Sur l'accueil, ouvrez **☁️ Google Drive — tester la connexion**, puis cliquez **🔄 Synchroniser les fiches maintenant**. Ensuite, la barre de gauche affiche `☁️ HH:MM` après chaque synchro, et chaque enregistrement est envoyé tout seul quelques secondes plus tard.
3. Sur le téléphone, touchez le bouton de synchro en haut à droite : les fiches du PC apparaissent.

---

## Au quotidien

- **Sans réseau**, l'appli fonctionne normalement. En haut, elle affiche « 📴 3 modif. en attente ». Dès que le réseau revient, elle envoie tout, et le badge redevient « ☁️ 14:32 ».
- **Connexion Google** : elle dure environ une heure. Ensuite, le badge affiche « 🔑 Toucher pour synchro » : un toucher suffit, sans mot de passe en général. En mode test, il est possible que Google redemande l'autorisation de temps en temps. Les modifications restent dans le téléphone en attendant.
- **Si la même fiche est modifiée sur le PC et sur le téléphone**, c'est la modification la plus récente qui est gardée.
- **Synchronisé** : la fiche client, le devis et la checklist. Les photos, rapports et documents restent sur le PC.
- **Numéro de dossier** : le téléphone propose le numéro suivant (format RAAAAMM###). Si le PC et le téléphone créent chacun un dossier hors ligne le même mois, la liste affiche « ⚠ n° en double » : corrigez le numéro sur une des deux fiches.
- **Sauvegarde** : dans Réglages, « 💾 Télécharger une copie des fiches » enregistre un fichier de secours.

## Dictaphone

- Sur le téléphone, ouvrez la fiche puis l'onglet **🎤 Dictée**. Touchez **Démarrer** ; ensuite **⏸ Pause / ▶ Reprendre**, et **⏹ Stop et enregistrer** à la fin. La première fois, le navigateur demande l'accès au micro : acceptez.
- Gardez l'appli ouverte pendant la dictée (l'écran reste allumé tout seul). Une bande rouge en bas rappelle qu'un enregistrement tourne, même si vous changez de page. Si l'appli se ferme en pleine dictée, ce qui a été enregistré est gardé.
- Au stop, la dictée part dans le dossier Drive (fichier `Dictee_<n° dossier>_<nom>_<date>`), tout de suite ou dès que le réseau revient.
- Sur le PC, page **Rapport** (ou **Note commentée**), carte **🎤 Dictées du téléphone** : les dictées du dossier en cours sont marquées ⭐ et déjà cochées. **📝 Transcrire et importer** les transcrit et met le texte dans « Paragraphe », comme l'import Transkriptor. Une dictée déjà transcrite ne coûte rien la deuxième fois.
- La transcription utilise la clé Mistral déjà dans config.ini (modèle Voxtral) : pas d'abonnement, on paie seulement les minutes transcrites, quelques centimes par heure de dictée.

## Photos

- Sur le téléphone, ouvrez la fiche puis l'onglet **📷 Photos** :
  - **Prendre une photo** ouvre l'appareil photo ;
  - **Galerie** permet de choisir plusieurs photos déjà prises.
- Les photos sont réduites (2560 px, largement assez pour un rapport), gardées dans le téléphone puis envoyées dans le **dossier Drive du client** (`R202610001 - DUPONT Jean`, créé automatiquement), comme les dictées. Badge ⏳ = en attente d'envoi, ☁️ = dans Drive.
- Sur le PC, page **Rapport**, carte « Volet photographique » : ouvrez **📲 Photos du téléphone** puis **📥 Ajouter les photos au rapport**. Il faut d'abord avoir chargé le client.

## Mettre à jour l'appli plus tard

Quand l'appli change, par exemple quand la checklist s'enrichit :

1. Sur le PC, régénérez les données en lançant, depuis le dossier du logiciel : `python mobile/generer_donnees.py . > mobile/data.js`
2. Dans `sw.js`, passez `VERSION` au numéro suivant (`expertfr-v2` devient `expertfr-v3`, etc.).
3. Sur GitHub, dans le dépôt `expertfr`, cliquez **Add file**, puis **Upload files**, et redéposez les fichiers modifiés. Le téléphone prend la nouvelle version à l'ouverture suivante, quand il a du réseau.
