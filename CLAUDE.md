# CLAUDE.md — Gala Live

Application pour un **gala de levée de fonds** : un formulaire mobile pour les promesses de dons, un écran de projection en direct et une administration. S'y ajoute un **quiz bilingue français / hébreu** (EI d'Israël, EEIF, scoutisme, histoire d'Israël), joué sur le téléphone des convives, avec un écran géant. Détails : `README.md`.

## Stack
- **Next.js 14** (App Router) + TypeScript + Tailwind, framer-motion, police Heebo, exceljs pour l'export.
- **Supabase** : projet « Gala Live », `rdcvlusfbbolrulcvntt`. Schéma dans `supabase/schema.sql` (dons), `supabase/quiz.sql` et `supabase/quiz_seed.sql` (quiz).
- **Vercel** : projet `gala-live`, déployé depuis ce dépôt.

## Organisation
- `app/` : pages `/` (promesse), `/live` (projection), `/admin` (+ `/admin/login`, `/admin/quiz`), `/quiz`, `/quiz/ecran`.
- `app/api/` : routes serveur. Les routes admin et dons utilisent la clé **service role, côté serveur uniquement**.
- `lib/auth.ts` (session admin), `lib/supabase.ts`, `lib/quiz-db.ts`, `lib/quiz-i18n.ts` (textes FR/HE).
- `components/` : UI du quiz (`quiz-ui.tsx`, `quiz-gauge.tsx`, `mil.tsx` = style « Qui veut gagner des millions »), logo.

## Commandes
```bash
npm install
npm run dev      # http://localhost:3000 (variables dans .env.local, voir .env.example)
npm run build    # doit passer avant toute PR : c'est le seul contrôle automatique
```
Il n'y a pas encore de tests automatisés. Vérifie dans un navigateur, sur mobile et sur l'écran géant.

## Variables d'environnement
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (secret), `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, `QUIZ_ADMIN_KEY` (secret). En option : `QUIZ_SUPABASE_URL` / `QUIZ_SUPABASE_ANON_KEY`. Ne jamais afficher, committer ni exposer côté navigateur une clé secrète.

## Règles de travail
- **Le quiz est totalement isolé des dons.** Il utilise ses tables `quiz_*` et ses fonctions SQL, appelées avec la clé publique. Il n'a jamais accès à `pledges` ni à `gala_settings`.
- **Préprod avant prod** : chaque environnement a sa propre partie de quiz (`VERCEL_ENV`). Toute nouveauté se teste sur l'aperçu Vercel de la PR avant d'être publiée.
- Le lien Smile **ne confirme pas un paiement**. Une promesse reste `pending` jusqu'à ce que l'admin la vérifie. Ne jamais présenter les montants comme des encaissements.
- Chaque texte du quiz existe **en français et en hébreu** (`lib/quiz-i18n.ts`). L'hébreu s'affiche en RTL.
- Les scripts SQL ne sont jamais exécutés sans que Lionel le sache. Dis clairement ce qu'il faut lancer.
- Travaille sur une branche avec une PR. « **yallah** » veut dire : fusionne dans `main`, puis vérifie le déploiement Vercel.
- Ne dis jamais qu'une chose est testée si elle ne l'a pas été.
