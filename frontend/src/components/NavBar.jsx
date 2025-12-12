import React from "react";

const navigate = (e, path) => {
  if (e && e.preventDefault) e.preventDefault();
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
};

const NavBar = () => {
  return (
    <nav className="main-nav nav-compact">
      <a href="/home" onClick={(e) => navigate(e, "/home")}>
        Accueil
      </a>
      <a href="/recipes" onClick={(e) => navigate(e, "/recipes")}>
        Recettes
      </a>
      <a href="/subrecipes" onClick={(e) => navigate(e, "/subrecipes")}>
        Library
      </a>
    </nav>
  );
};

export default NavBar;
