# Gala Live

Application de promesses de dons pour un gala, avec formulaire mobile, écran de projection et administration.

## Installation

1. Créer un projet Supabase.
2. Exécuter `supabase/schema.sql` dans le SQL Editor de Supabase.
3. Déployer le dépôt sur Vercel avec le framework Next.js.
4. Configurer les variables d'environnement (voir `.env.example`):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` (secret, **jamais** exposé au navigateur)
   - `ADMIN_PASSWORD` (mot de passe long et unique)
   - `ADMIN_SESSION_SECRET` (chaîne aléatoire longue)
5. Installer les dépendances avec `npm install`, puis lancer `npm run dev` en local ou déployer sur Vercel.
6. Ouvrir `/admin/login`, configurer les noms des projets et le lien Smile.

## Pages

- `/` : saisie d'une promesse et répartition des pourcentages.
- `/live` : montants promis et progression, actualisés toutes les 3 secondes.
- `/admin` : configuration et gestion des statuts.

## Important avant utilisation réelle

- Le lien Smile redirige le navigateur, mais **ne confirme pas un paiement**. Les promesses sont créées avec le statut `pending`; l'admin peut marquer un paiement après vérification indépendante.
- Les données privées ne sont pas exposées directement à Supabase anon; les routes sensibles utilisent la clé service role côté serveur.
- Il faut encore ajouter des protections contre le spam et le brute force, des limites de requêtes, une politique de confidentialité et des tests complets.
- Les statistiques de `/live` incluent les promesses `pending` et `paid`, pas les promesses annulées. Ce ne sont pas des encaissements.
- Cette version utilise un polling de 3 secondes, **pas encore Supabase Realtime**.
- Ne pas présenter cette version comme une application auditée ou prête à gérer une collecte réelle sans validation.

## Quiz bilingue FR / HE

Quiz récréatif sur les EI d'Israël, les EEIF, le scoutisme et l'histoire d'Israël. Totalement isolé des dons : tables `quiz_*` et fonctions SQL dédiées, appelées avec la clé publique (aucun accès à `pledges` ni `gala_settings`).

### Pages

- `/quiz` : joueurs (un seul QR code). Choix Français / עברית à l'entrée, bascule de langue à tout moment sans perdre sa progression, RTL pour l'hébreu, inscription par prénom + numéro de table.
- `/quiz/ecran` : écran géant, entièrement bilingue (FR à gauche, HE à droite). QR code, jauge de présence, questions, bonne réponse puis écran des résultats après chaque question, podium final.
- `/admin/quiz` : pilotage en direct, réglages de la salle, éditeur de questions bilingue, classement complet, téléchargement du QR.

### Déroulé

1. **Ouvrir le quiz** : les convives scannent et s'inscrivent ; la jauge de présence se remplit.
2. **Échauffement** (non noté) : démarre automatiquement quand X % des convives attendus sont inscrits (50 % par défaut). Les questions d'échauffement s'enchaînent seules.
3. **Grand jeu** : démarre automatiquement à Y % (80 % par défaut). Chaque question se révèle seule à la fin du chrono ; l'animateur passe à la suivante.
4. **Terminer** : podium des tables.

Score : 100 points par bonne réponse + jusqu'à 50 points de bonus rapidité. Classement des tables à la moyenne des points par joueur.

### Installation

1. Exécuter `supabase/quiz.sql` en remplaçant `__ADMIN_KEY_SHA256__` par le SHA-256 (hex) de `QUIZ_ADMIN_KEY`, puis `supabase/quiz_seed.sql`.
2. Variables : `QUIZ_ADMIN_KEY` (secret). Optionnel : `QUIZ_SUPABASE_URL` / `QUIZ_SUPABASE_ANON_KEY` pour pointer le quiz vers une autre base (préprod) ; sinon `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. La production et la préprod ont chacune leur propre partie (`VERCEL_ENV`).
