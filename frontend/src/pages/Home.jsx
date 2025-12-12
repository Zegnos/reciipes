import React from "react";
import "../styles/Home.css";
import { getAuthUrl } from "../services/recipeService";

const steps = [
  "Noter une recette pendant que tu cuisines encore",
  "Ajouter vite fait une photo de ton carnet papier et les mettre au propre plus tard (ou pas :)",
  "Partager une recette avec la famille, ou la garder pour toi ^^",
  "Exporter tes recettes en PDF pour les imprimer facilement",
];

function Home() {
  return (
    <div className="home">
      <header className="home-header">
        <div className="container">
          <p className="home-tag">Vos recettes, sans prise de tête</p>
          <h1 className="home-title">Reciipes</h1>
          <p className="home-subtitle">
            Un endroit simple pour tes recettes préférées
          </p>
          <p className="home-description">
            Toutes mes recettes étaient éparpillé dans ma galerie, mes notes, un
            post-it... J'ai crée Reciipes pour avoir un outil simple, sans prise
            de tête : pas d&apos;algorithme, pas de notifications, pas de
            blabla, juste un carnet numérique propre a chacun !
          </p>
          <div className="home-links">
            <button
              onClick={async () => {
                try {
                  const resp = await fetch("/api/user", {
                    credentials: "include",
                  });
                  if (resp.ok) {
                    window.history.pushState({}, "", "/recipes");
                    window.dispatchEvent(new PopStateEvent("popstate"));
                    return;
                  }
                } catch (e) {}
                window.location.href = getAuthUrl();
              }}
              className="btn-primary"
            >
              Tester l&apos;app !
            </button>
            <a
              href="https://github.com/Zegnos/reciipes"
              target="_blank"
              rel="noopener noreferrer"
              className="home-link"
              aria-label="Voir le code sur GitHub (ouvre dans un nouvel onglet)"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                width="20"
                height="20"
                aria-hidden="true"
                focusable="false"
              >
                <path
                  fill="currentColor"
                  d="M12 .5A12 12 0 0 0 0 12.5c0 5.3 3.4 9.8 8.2 11.4.6.1.8-.2.8-.6v-2.1c-3.3.7-4-1.6-4-1.6-.5-1.3-1.2-1.6-1.2-1.6-1-.7.1-.7.1-.7 1.2.1 1.9 1.3 1.9 1.3 1 .1.8 1.8 2.6 1.2.1-.8.4-1.2.7-1.5-2.6-.3-5.3-1.3-5.3-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.6.1-3.3 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0c2.2-1.5 3.3-1.2 3.3-1.2.6 1.7.2 3 .1 3.3.8.8 1.2 1.9 1.2 3.2 0 4.6-2.7 5.6-5.3 5.9.4.3.8 1 .8 2v3c0 .4.2.7.8.6A12 12 0 0 0 24 12.5 12 12 0 0 0 12 .5z"
                />
              </svg>
              Voir le code
            </a>
          </div>
        </div>
      </header>

      <section className="home-section">
        <div className="container">
          <h2>En vrai, c&apos;est quoi ?</h2>
          <p className="section-lead">
            Un espace où tu rentres tes recettes sans réfléchir, avec trois
            idées simples :
          </p>
          <ul className="home-list">
            {steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="home-section home-note">
        <div className="container">
          <p className="note-title">Notes rapides</p>
          <p className="note-text">
            Chaque carte garde ingrédients, étapes, temps, photos, sous-recettes
            et un PDF propre à imprimer. Tu peux partager un lien unique ou
            garder ta recette pour toi !
          </p>
        </div>
      </section>

      <section className="home-section home-maker">
        <div className="container maker-grid">
          <div>
            <h2>Utiliser la version Self-Hosted</h2>
            <p>
              Reciipes est open source et tu peux l&apos;héberger toi-même
              facilement, que ce soit sur un ordinateur, un NAS, ou un serveur
              distant — ainsi tu gardes le contrôle total sur tes données.
            </p>
          </div>
          <div className="maker-card">
            <p className="maker-label">Pour installer rapidement avec docker</p>
            <pre>
              <code>{`git clone https://github.com/Zegnos/reciipes.git
cd reciipes

cp api/.env.example api/.env
# Édite api/.env pour configurer la base de données

chmod +x ./setup.sh && ./setup.sh`}</code>
            </pre>
            <p className="maker-foot"></p>
          </div>
        </div>
      </section>

      <footer className="home-footer">
        <div className="container">
          <p>© 2025 Reciipes — Fait pour les gens, pas pour l'argent</p>
          <div className="footer-links">
            <a href="/legal">Mentions légales & Politique de Confidentialité</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Home;
