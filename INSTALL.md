# Installation rapide (Docker) — reciipes

Méthode unique et recommandée.

Prérequis : `Docker` et `docker compose` installés sur la machine.

1. Cloner le dépôt

```bash
git clone https://github.com/Zegnos/reciipes.git
cd reciipes
```

2. Préparer l'environnement

```bash
cp api/.env.example api/.env
# Éditez `api/.env` et renseignez au minimum : DB_HOST, DB_PORT (3306), DB_USER, DB_PASSWORD, DB_NAME, SESSION_SECRET
```

3. Lancer l'installation et démarrer les services

```bash
chmod +x ./setup.sh && ./setup.sh
```

À la fin du script, les URLs d'accès seront affichées. Par défaut :

- Frontend : http://localhost:3014
- API : http://localhost:2029

Remarque de sécurité : le script évite d'écraser une base existante — il n'exécutera pas automatiquement le SQL si la base contient déjà des tables.