# App Magasin Stock

Application web simple de consultation et gestion du stock magasin, connectée à une base **Airtable**.

Fonctionnalités :

- Recherche par nom de produit → liste de résultats → fiche détaillée.
- Modification de la **quantité** par tout utilisateur.
- Modification du **prix unitaire** réservée au rôle **administrateur** (déblocage par un code secret).
- Bascule **Français ⇄ Arabe** (avec affichage RTL en arabe).
- **Mode hors ligne (PWA)** : app installable, consultation et recherche sans connexion, modifications mises en file d'attente et synchronisées automatiquement au retour du réseau.

Stack : Next.js 14 (App Router) · TypeScript · React · Tailwind CSS · IndexedDB (idb).

## Prérequis

- Node.js 18+ et npm.

## Installation

```bash
npm install
```

## Configuration

Crée un fichier `.env.local` à la racine (copie de `.env.local.example`) :

```bash
cp .env.local.example .env.local
```

Puis renseigne les valeurs :

| Variable           | Description                                                                 |
| ------------------ | --------------------------------------------------------------------------- |
| `AIRTABLE_TOKEN`   | Personal Access Token Airtable. Scopes : `data.records:read`, `data.records:write`. À créer sur https://airtable.com/create/tokens (donner accès à la base concernée). |
| `AIRTABLE_BASE_ID` | `app0W62stmr8peFrx` (déjà pré-rempli).                                       |
| `AIRTABLE_TABLE_ID`| `tblgD3a5Zi6LnwYqR` (déjà pré-rempli).                                       |
| `ADMIN_CODE`       | Le code secret qui débloque la modification du prix unitaire.               |

> Le token Airtable et le code admin restent **côté serveur** : ils ne sont jamais exposés au navigateur. Toutes les requêtes Airtable passent par les routes API internes (`/api/...`).

## Lancement en développement

```bash
npm run dev
```

Ouvre http://localhost:3000.

## Production

```bash
npm run build
npm start
```

## Fonctionnement

### Recherche

La recherche filtre les enregistrements dont les champs `Produit`, `Produit1`, `Produit2`, `Référence` ou `Fournisseur` contiennent le terme saisi (insensible à la casse).

### Rôle administrateur

Clique sur **Mode admin**, saisis le code secret (`ADMIN_CODE`). Une fois validé, le champ prix unitaire devient modifiable. Le code est vérifié côté serveur et conservé uniquement pour l'onglet en cours (sessionStorage).

### Langue

Le bouton de langue bascule entre français et arabe. La préférence est mémorisée (localStorage). En arabe, l'interface passe en mode RTL.

### Mode hors ligne (PWA)

L'app est une PWA installable (Ajouter à l'écran d'accueil sur mobile).

- **Cache local** : quand il y a du réseau, tous les enregistrements Airtable sont copiés dans le navigateur (IndexedDB). La recherche se fait toujours sur cette copie locale, donc elle fonctionne **même sans connexion**.
- **Synchro descendante** : au démarrage et à chaque retour de connexion, l'app récupère la dernière version des données. La date de dernière synchro est affichée en haut.
- **Modifications hors ligne** : changer une quantité, un prix ou une photo sans réseau est enregistré localement et **mis en file d'attente**. Le nombre de modifs en attente est affiché. Dès que la connexion revient, tout est envoyé automatiquement à Airtable (bouton « Synchroniser » aussi disponible manuellement).
- **Stratégie de conflit** : « dernière écriture gagne » (suffisant ici car il est très peu probable que deux personnes modifient la même fiche en même temps).

> Les icônes PWA utilisent un SVG (`public/icon.svg`). Pour une compatibilité maximale sur tous les appareils, tu peux ajouter des PNG 192×192 et 512×512 et les déclarer dans `public/manifest.webmanifest`.

> Le service worker (`public/sw.js`) ne s'active qu'en HTTPS ou sur `localhost`. En production, sers l'app en HTTPS pour que le mode hors ligne fonctionne.

## Structure

```
public/
  manifest.webmanifest         # Manifeste PWA
  icon.svg                     # Icône de l'app
  sw.js                        # Service worker (cache hors ligne)
src/
  app/
    layout.tsx                 # Providers + metadata PWA + enregistrement SW
    page.tsx                   # Page principale (recherche locale / liste / fiche)
    globals.css
    api/
      products/route.ts        # GET recherche (serveur, optionnel)
      products/all/route.ts    # GET tous les enregistrements (synchro locale)
      products/[id]/route.ts   # GET fiche + PATCH quantité/prix
      products/[id]/photo/route.ts # POST nouvelle photo
      auth/route.ts            # POST vérification du code admin
  lib/
    airtable.ts                # Client Airtable (serveur)
    store.ts                   # Cache IndexedDB + recherche locale + file d'attente
    types.ts                   # Types des champs
  i18n/
    translations.ts            # Dictionnaire FR / AR
    I18nProvider.tsx           # Contexte langue + RTL
  context/
    AuthProvider.tsx           # Contexte rôle admin
    OfflineProvider.tsx        # Contexte réseau / synchro / file d'attente
  components/
    SearchBar.tsx
    ResultList.tsx
    ProductCard.tsx
    PhotoUploader.tsx          # Caméra / fichier + file d'attente hors ligne
    LanguageToggle.tsx
    AdminLogin.tsx
    SyncStatus.tsx             # Bandeau hors ligne + état de synchro
    ServiceWorkerRegister.tsx  # Enregistre le service worker
```

## Notes

- Le champ `Total` est une formule Airtable (lecture seule).
- Les images proviennent des pièces jointes Airtable (champ `Photo`).
- Si tu ajoutes des langues ou des libellés, édite `src/i18n/translations.ts`.
