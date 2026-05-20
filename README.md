# Padel Tours — Méta-moteur de créneaux

Trouve un terrain de padel dispo dans l'agglomération de Tours, en interrogeant en temps réel tous les sites de réservation (Playtomic, Doinsport, Anybuddy, sites custom) derrière une seule interface mobile-first.

**MVP search-only** : on liste les créneaux, on renvoie l'utilisateur vers le site du provider pour finaliser la résa. Pas de booking in-app, pas de paiement, pas de compte utilisateur.

## Architecture en deux phrases

Une table `clubs` (Postgres + PostGIS) recense les clubs de l'agglo avec leur coordonnées GPS et leur provider de réservation. À chaque recherche, on récupère les clubs dans le rayon demandé puis on fan-out en parallèle vers les adapters de chaque provider, on cache 2-5 min, on trie par heure, on renvoie.

## Stack

- **Frontend + API** : Next.js 15 (App Router), Tailwind, mobile-first PWA
- **DB** : Postgres 16 + PostGIS (Docker en local, Supabase en prod)
- **Cache** : in-memory `Map` (suffisant MVP — passer sur Upstash Redis quand on aura plus d'instances)
- **Tests** : Vitest

## Démarrer

### 1. Pré-requis

- Node 20+
- pnpm 9+
- Docker + Docker Compose (pour la DB locale)

### 2. Install

```bash
cd padel-tours
pnpm install
cp .env.example .env
```

### 3. DB locale + migrations

```bash
pnpm db:up         # démarre Postgres+PostGIS dans Docker
pnpm db:migrate    # crée les tables
pnpm db:seed       # importe data/clubs.csv
```

### 4. Lancer le dev server

```bash
pnpm dev
```

Ouvre [http://localhost:3000](http://localhost:3000) sur ton téléphone (même WiFi) ou en mobile mode dans Chrome DevTools.

Par défaut `ADAPTERS_MODE=mock`, tu auras donc des créneaux fictifs déterministes. Quand tu auras reverse-engineeré au moins un provider, passe à `ADAPTERS_MODE=live` dans `.env`.

## Workflow par phase (du plan original)

### Phase 0 — Recensement (à faire à la main)

Suis `data/RECENSEMENT.md` pour :
1. Lister les 10-15 clubs de padel de l'agglo Tours dans `data/clubs.csv`
2. Identifier le provider de chaque club via DevTools
3. Compter les clubs par provider pour choisir le premier à attaquer

### Phase 1 — POC adapter

Suis `src/lib/adapters/README.md` pour reverse-engineerer ton premier provider (probablement Playtomic ou Doinsport en fonction du résultat de phase 0). Les stubs `playtomic.ts` / `doinsport.ts` / `anybuddy.ts` contiennent déjà la structure attendue — il suffit de compléter l'URL, les headers et la fonction `parseXxx`.

Pour tester sans même finir le reverse-engineering, lance le dev en `ADAPTERS_MODE=mock` : tout le pipeline (DB → search → UI) tourne avec des données simulées déterministes.

### Phase 2 — Backend (DÉJÀ FAIT)

- Schema SQL avec PostGIS : [`infra/schema.sql`](infra/schema.sql)
- Repository géo : [`src/lib/repositories/clubs.ts`](src/lib/repositories/clubs.ts)
- Search aggregator : [`src/lib/search.ts`](src/lib/search.ts)
- API : [`src/app/api/search/route.ts`](src/app/api/search/route.ts)

### Phase 3 — Frontend (DÉJÀ FAIT)

- Page recherche : [`src/app/page.tsx`](src/app/page.tsx)
- Form mobile-first : [`src/components/SearchForm.tsx`](src/components/SearchForm.tsx)
- Page résultats : [`src/app/results/page.tsx`](src/app/results/page.tsx)
- PWA manifest : [`public/manifest.json`](public/manifest.json)

### Phase 4 — Monitoring + beta

- Endpoint healthcheck : `GET /api/healthcheck`
- CLI healthcheck (à cron-er quotidiennement) : `pnpm healthcheck`
- Logs adapter en DB : table `adapter_logs`
- **TODO** : brancher Sentry sur les `AdapterError` (`SENTRY_DSN` dans `.env`)

### Procédure de beta privée

1. Déployer sur Vercel (free tier) + Supabase (free tier)
2. Importer le CSV en prod (`pnpm db:seed` en pointant `DATABASE_URL` sur Supabase)
3. Partager l'URL à 5-10 joueurs du coin (groupe WhatsApp, Discord local)
4. Recueillir feedback via un Tally form linké en footer
5. Surveiller `/api/healthcheck` + table `adapter_logs` quotidiennement

## Commandes utiles

```bash
pnpm dev              # dev server
pnpm build && pnpm start
pnpm typecheck        # tsc --noEmit
pnpm test             # vitest
pnpm db:up            # docker postgres
pnpm db:down          # stop docker postgres
pnpm db:migrate       # apply schema
pnpm db:seed          # import data/clubs.csv
pnpm healthcheck      # ping all adapters + db
```

## Décisions de design verrouillées

- **Search-only** : pas de booking in-app au MVP (réduit la complexité × 10 et limite les risques légaux)
- **Pas de compte utilisateur** : pas besoin pour search-only
- **PWA** plutôt que app native : déploiement instantané, MAJ sans store
- **Mock adapter activable** via env var : permet de bosser l'UI sans dépendre des providers
- **Cache TTL court (3 min)** : équilibre fraîcheur des dispos vs charge sur les providers
- **Logs en DB** plutôt qu'en fichier : facilite le monitoring + analyse rétrospective des taux d'erreur par adapter

## Risques connus + plans B

| Risque | Mitigation |
|---|---|
| Adapter casse suite à un changement provider | Healthcheck quotidien + Sentry + logs en DB |
| CGU du provider interdisent le scraping | Contacter le club et lui demander d'autoriser, sinon retirer ce club |
| Anti-bot (Cloudflare) | Cache long + User-Agent honnête + proxy résidentiel si nécessaire (~50€/mois) |
| Anybuddy est un concurrent direct | Angle = focus local Tours + UX épurée + alertes "créneau qui se libère" en phase 5 |
| Pas de modèle économique au MVP | OK, on valide d'abord la traction. Ensuite affiliation / freemium pour les alertes |

## Phases futures (post-MVP, hors scope actuel)

- Alertes push "préviens-moi si un créneau dimanche 18h se libère" (gros différenciant vs Anybuddy)
- Booking in-app (nécessite compte utilisateur + intégration paiement)
- Multi-villes
- Multi-sports (tennis, squash)
- App native React Native si la traction le justifie
- Système d'avis / scoring de clubs
