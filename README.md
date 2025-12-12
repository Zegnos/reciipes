# Reciipes

Application de gestion de recettes (API Node.js + Frontend React). Ce README donne une méthode simple et reproductible pour lancer le projet : Docker + `docker compose`.

## Self-Hosted (Résumé)

Prérequis : `Docker` et `docker compose` installés.

```bash
git clone https://github.com/Zegnos/reciipes.git
cd reciipes
cp api/.env.example api/.env    # éditer les valeurs nécessaires (DB_*, SESSION_SECRET)
chmod +x ./setup.sh
./setup.sh
```

---

## Self-hosted (rapide)

Prérequis : `Docker` et `docker compose`.

1. Cloner le repo :

```bash
git clone https://github.com/Zegnos/reciipes.git
cd reciipes
```

2. Préparer l'env :

```bash
cp api/.env.example api/.env
# édite api/.env (DB_*, SESSION_SECRET, etc.)
```

3. Lancer (script d'installation) :

```bash
chmod +x ./setup.sh && ./setup.sh
```

Accès après démarrage :

- Frontend (conteneur prod) : http://localhost:3014
- Frontend (dev Vite) : http://localhost:5173
- API : http://localhost:2029

---

## Lancer en local (développement)

Frontend (vite) :

```bash
cd frontend
npm install
npm run dev
```

Backend (si tu veux lancer l'API local sans Docker) :

```bash
cd api
npm install
node server.js
```

---

## Contribuer

Merci ! processus simple :

1. Fork → nouvelle branche → modifs.
2. Tests manuels rapides (front : `npm run dev`, back : lancer API).
3. Commit clair et PR.

Points utiles :

- Respecte le style existant.
- Si c'est une grosse feature, tu peux ouvrir d'abord une issue pour en discuter.

---

## Variables essentielles (`api/.env`)

- `DB_HOST`, `DB_PORT` (3306), `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `SESSION_SECRET`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`

---

## Commandes rapides

```bash
# Tout en local via Docker Compose
docker compose up --build -d
docker compose logs -f
docker compose down

# Builder l'image
docker build -f Dockerfile.single -t reciipes:local .
docker run -p 3014:2029 --name reciipes-single -v "$PWD/uploads":/app/uploads -d reciipes:local
```

---
V2 : 12/12/25