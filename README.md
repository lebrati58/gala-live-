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
