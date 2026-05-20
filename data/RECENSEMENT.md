# Phase 0 — Recensement des clubs de padel de l'agglo Tours

Ce document guide la collecte manuelle des données nécessaires pour seeder la base.

## Étape 1 — Trouver tous les clubs

Sources à consulter (mettre les résultats dans `clubs.csv`) :

1. **Google Maps** — recherche `padel Tours`, `padel Joué-lès-Tours`, `padel Saint-Avertin`, `padel Saint-Cyr-sur-Loire`, `padel Chambray-lès-Tours`, `padel La Riche`, `padel Saint-Pierre-des-Corps`.
2. **padelnautes.com** — annuaire FR avec carte interactive
3. **fft.fr** (Fédération Française de Tennis) — beaucoup de clubs de tennis ont rajouté du padel
4. **Playtomic.io** — leur recherche par ville liste leurs clubs partenaires
5. **Anybuddy.fr** — pareil, filtre par ville
6. **Doinsport** — pas de catalogue public, on les trouve via les sites des clubs

Cible : **10-15 clubs** dans l'agglomération de Tours (rayon ~25 km autour de la place Anatole-France).

## Étape 2 — Identifier le provider de chaque club

Pour chaque club, ouvrir son site de réservation et regarder l'URL ainsi que le trafic réseau.

### Méthode rapide (URL uniquement)

| Indice dans l'URL | Provider |
|---|---|
| `playtomic.io/*` ou `*.playtomic.io` | `playtomic` |
| `*.doinsport.club` ou `app.doinsport.com` | `doinsport` |
| `anybuddy.fr/*` ou `anybuddy.com/*` | `anybuddy` |
| `tenup.fft.fr` | `tenup` |
| `*.balle-jaune.fr` | `balle-jaune` |
| Autre | `custom` (site propre au club) |

### Méthode approfondie (DevTools)

1. Ouvrir le site de réservation du club dans Chrome/Firefox
2. F12 → onglet **Network** → filtrer `XHR/Fetch`
3. Cliquer sur une date / un créneau
4. Regarder les appels API :
   - Domaine de l'API (ex: `api.playtomic.io`, `api.doinsport.com`)
   - Format de la réponse (JSON typiquement)
   - Token / cookie d'authentification éventuel
5. Noter dans `clubs.csv` colonne `externalId` la valeur utilisée par le provider pour identifier ce club (souvent dans l'URL ou dans le payload).

## Étape 3 — Récupérer les coordonnées GPS

Pour chaque club, dans Google Maps :
1. Clic droit sur le marker du club
2. Le premier item du menu affiche les coordonnées (`47.39414, 0.68484`)
3. Premier nombre = `lat`, second = `lng`. Copier dans `clubs.csv`.

## Étape 4 — Choisir le premier provider à attaquer

Une fois `clubs.csv` rempli, compter :

```bash
# Compter les clubs par provider
awk -F',' 'NR>1 {print $9}' clubs.csv | sort | uniq -c | sort -rn
```

Le provider en tête couvre probablement 50%+ des clubs → **c'est lui qu'on attaque en phase 1**.

## Format `clubs.csv`

| Colonne | Description | Exemple |
|---|---|---|
| `slug` | Identifiant URL-safe unique | `casa-padel-tours` |
| `name` | Nom affiché | `Casa Padel Tours` |
| `address` | Adresse complète | `12 rue de la Paix` |
| `postalCode` | Code postal | `37000` |
| `city` | Ville | `Tours` |
| `lat` | Latitude (5 décimales min) | `47.39414` |
| `lng` | Longitude (5 décimales min) | `0.68484` |
| `courtsCount` | Nombre de terrains | `4` |
| `provider` | Provider de réservation | `playtomic` |
| `externalId` | ID interne chez le provider | `5f7e8d9c-...` |
| `bookingBaseUrl` | URL de réservation publique | `https://playtomic.io/casa-padel-tours` |
| `notes` | Remarques libres | `Outdoor uniquement, fermé l'hiver` |

## Une fois rempli

Lancer le seed :

```bash
pnpm db:seed
```

Le script lit `clubs.csv` et peuple la table `clubs` en DB.
