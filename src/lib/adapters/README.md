# Adapters — guide d'implémentation

Chaque provider de réservation a son propre adapter qui implémente `ProviderAdapter` (voir `types.ts`).

## Mode `mock` vs `live`

Au démarrage, `ADAPTERS_MODE=mock` dans `.env` : tous les providers sont remplacés par `MockAdapter` qui génère des créneaux fake déterministes. Ça permet de bosser l'UI et l'API sans dépendre des vrais providers.

Une fois que tu as reverse-engineeré au moins un provider, bascule à `ADAPTERS_MODE=live` dans `.env`.

## Workflow de reverse-engineering d'un nouveau provider

1. **Sniff l'API**
   - Ouvrir l'app web/mobile du provider dans Chrome avec DevTools → onglet Network → filtre XHR/Fetch
   - Cliquer sur "voir disponibilités" pour un club + une date connus
   - Identifier l'endpoint, la méthode (GET/POST), les query params / body, les headers requis
2. **Reproduire avec curl**
   ```bash
   curl 'https://api.provider.com/availability?club_id=...&date=...' \
     -H 'User-Agent: ...' -H 'Accept: application/json'
   ```
3. **Mapper la réponse vers `Slot[]`**
   - Compléter la fonction `parseXxx` dans l'adapter
   - Tester sur 2-3 clubs réels pour valider la robustesse
4. **Ajouter un test**
   - Capturer un payload réel dans `tests/fixtures/{provider}.json`
   - Tester que `parseXxx(fixture)` produit le bon `Slot[]`
5. **Lancer le healthcheck**
   - `pnpm healthcheck` doit retourner `ok: true` pour ce provider

## Conventions

- Un adapter ne fait **que** récupérer la dispo. Il ne touche pas la DB, ne logge pas en dehors d'erreurs, ne met pas en cache (le cache est en couche supérieure).
- Toutes les erreurs réseau, parsing, etc. doivent être enveloppées dans `AdapterError` pour que le fan-out parallèle puisse les isoler proprement.
- Pas de retry dans l'adapter — le retry est géré par la couche search avec backoff.
- Timeout obligatoire (`AbortSignal.timeout(8000)`) pour éviter qu'un provider lent bloque tout.

## Sites custom

Pour un club avec son propre back-office (pas Playtomic/Doinsport/Anybuddy), créer une classe dédiée qui hérite ou compose `CustomAdapter`. Exemples de stratégies :

- **API JSON cachée** : 90% des cas, l'API existe, faut juste la trouver dans DevTools.
- **Scraping HTML** : `cheerio` si SSR, `playwright` si SPA. Coût : lent + fragile.
- **Flux iCal partenariat** : contacter le club, certains acceptent volontiers.
