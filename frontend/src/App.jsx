import React, { useState, useEffect } from "react";
import { recipeService } from "./services/recipeService";
import SearchAndFilters from "./components/SearchAndFilters";
import RecipeCard from "./components/RecipeCard";
import RecipeDetail from "./components/RecipeDetail";
import RecipeForm from "./components/RecipeForm";
import Home from "./pages/Home";
import Http418 from "./pages/Http418";
import Http404 from "./pages/Http404";
import LegalPage from "./components/LegalPage";
import UserProfile from "./components/UserProfile";
import SharedRecipePage from "./components/SharedRecipePage";
import MySubrecipes from "./components/MySubrecipes";
import NavBar from "./components/NavBar";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [recipes, setRecipes] = useState([]);
  const [filteredRecipes, setFilteredRecipes] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    type: "all",
    category: "all",
    maxTime: "all",
  });
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [error, setError] = useState(null);
  const [notifications, setNotifications] = useState([]);

  const [locationPath, setLocationPath] = useState(window.location.pathname);
  useEffect(() => {
    const onLocation = () => setLocationPath(window.location.pathname);
    window.addEventListener("popstate", onLocation);
    return () => window.removeEventListener("popstate", onLocation);
  }, []);

  const pathname = locationPath;
  const isSharedRecipe = pathname.startsWith("/share/");
  const shareToken = isSharedRecipe ? pathname.split("/share/")[1] : null;

  const isAssetOrApi =
    pathname.startsWith("/api") ||
    pathname.startsWith("/uploads") ||
    pathname.includes(".");
  const isKnownRoute =
    pathname === "/" ||
    pathname.startsWith("/home") ||
    pathname.startsWith("/recipes") ||
    pathname.startsWith("/subrecipes") ||
    pathname.startsWith("/share/") ||
    pathname.startsWith("/legal") ||
    pathname === "/418" ||
    pathname === "/404" ||
    pathname.startsWith("/auth");

  if (!isAssetOrApi && !isKnownRoute) {
    return <Http404 />;
  }

  useEffect(() => {
    const checkAuth = async (retryCount = 0) => {
      try {
        console.log(
          "Vérification de l'authentification...",
          retryCount > 0 ? `(tentative ${retryCount + 1})` : ""
        );

        const response = await fetch("/api/user", {
          credentials: "include",
        });

        console.log("Réponse /api/user:", response.status, response.ok);

        if (response.ok) {
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const userData = await response.json();
            console.log("Données utilisateur reçues:", userData);
            setUser(userData);

            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get("auth") === "success") {
              console.log("Nettoyage de l'URL auth=success");
              window.history.replaceState({}, "", window.location.pathname);
            }
          } else {
            console.log("Réponse non-JSON reçue, probablement une redirection");
            setUser(null);
          }
        } else {
          console.log("Utilisateur non authentifié");

          if (
            retryCount === 0 &&
            (window.location.search.includes("auth=success") ||
              document.referrer.includes("accounts.google.com"))
          ) {
            console.log("Réessai de l'authentification dans 1 seconde...");
            setTimeout(() => checkAuth(1), 1000);
            return;
          }
        }
      } catch (error) {
        console.error(
          "Erreur lors de la vérification de l'authentification:",
          error
        );
      } finally {
        if (
          retryCount > 0 ||
          !window.location.search.includes("auth=success")
        ) {
          console.log("Authentification vérifiée");
          setAuthChecked(true);
        }
      }
    };

    checkAuth();
  }, []);

  useEffect(() => {
    const loadRecipes = async () => {
      if (!user) return;

      try {
        setLoading(true);
        setError(null);
        const allRecipes = await recipeService.getAllRecipes();
        setRecipes(allRecipes);
        setFilteredRecipes(allRecipes);
      } catch (error) {
        console.error("Erreur lors du chargement des recettes:", error);
        setError(
          "Impossible de charger les recettes. Vérifiez que le serveur backend est démarré."
        );
      } finally {
        setLoading(false);
      }
    };

    if (authChecked) {
      loadRecipes();
    }
  }, [user, authChecked]);

  useEffect(() => {
    let result = recipes;

    if (searchTerm) {
      result = recipeService.searchRecipesByName(recipes, searchTerm);
    }

    result = recipeService.filterRecipes(result, filters);

    setFilteredRecipes(result);
  }, [recipes, searchTerm, filters]);

  // Gérer le scroll du body quand une recette est ouverte
  useEffect(() => {
    if (selectedRecipe) {
      document.body.classList.add("modal-open");
    } else {
      document.body.classList.remove("modal-open");
    }

    return () => {
      document.body.classList.remove("modal-open");
    };
  }, [selectedRecipe]);

  const handleRecipeClick = async (recipe) => {
    try {
      const fullRecipe = await recipeService.getRecipeById(recipe.id);
      setSelectedRecipe(fullRecipe);
    } catch (error) {
      console.error(
        "Erreur lors de la récupération des détails de la recette:",
        error
      );
      setSelectedRecipe(recipe);
    }
  };

  const handleCloseDetail = () => {
    setSelectedRecipe(null);
  };

  const handleAddRecipe = () => {
    setEditingRecipe(null);
    setShowForm(true);
  };

  const showNotification = (message, type = "success") => {
    const id = Date.now();
    const notification = { id, message, type };
    setNotifications((prev) => [...prev, notification]);

    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 4000);
  };

  const removeNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleEditRecipe = (recipe) => {
    setEditingRecipe(recipe);
    setShowForm(true);
    setSelectedRecipe(null);
  };

  const handleSaveRecipe = async (recipeData) => {
    try {
      let savedRecipe;
      if (editingRecipe) {
        savedRecipe = await recipeService.updateRecipe(
          editingRecipe.id,
          recipeData
        );
        setRecipes((prev) =>
          prev.map((r) => (r.id === editingRecipe.id ? savedRecipe : r))
        );
      } else {
        savedRecipe = await recipeService.addRecipe(recipeData);
        setRecipes((prev) => [...prev, savedRecipe]);
      }

      setShowForm(false);
      setEditingRecipe(null);

      showNotification(
        editingRecipe
          ? "Recette modifiée avec succès !"
          : "Recette ajoutée avec succès !",
        "success"
      );

      return savedRecipe;
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
      console.error("Vérifiez que le serveur backend est démarré.");
      throw error;
    }
  };

  const handleDeleteRecipe = async (recipeId) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cette recette ?")) {
      try {
        await recipeService.deleteRecipe(recipeId);
        setRecipes((prev) => prev.filter((r) => r.id !== recipeId));
        setSelectedRecipe(null);
        showNotification("Recette supprimée avec succès !", "success");
      } catch (error) {
        console.error("Erreur lors de la suppression:", error);
        showNotification(
          "Erreur lors de la suppression de la recette. Vérifiez que le serveur backend est démarré.",
          "error"
        );
      }
    }
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingRecipe(null);
  };

  const handleLogout = () => {
    window.location.href = "/auth/logout";
  };

  if (pathname.startsWith("/legal")) {
    return <LegalPage />;
  }
  if (pathname === "/418") {
    return <Http418 />;
  }

  if (pathname === "/404") {
    return <Http404 />;
  }

  if (isSharedRecipe && shareToken) {
    return <SharedRecipePage shareToken={shareToken} />;
  }

  if (pathname === "/" || pathname.startsWith("/home")) {
    return <Home />;
  }

  if (pathname.startsWith("/subrecipes")) {
    if (!user) return <Home />;
    return (
      <div className="app">
        <div className="app-header">
          <div className="app-brand">
            <img
              src="/Logo_reciipes_nobg.png"
              alt="Reciipes"
              className="app-logo"
            />
            <h1>Reciipes</h1>
          </div>
          <UserProfile user={user} onLogout={handleLogout} />
        </div>
        <NavBar />
        <MySubrecipes />
      </div>
    );
  }

  if (pathname.startsWith("/recipes")) {
    if (!user) return <Home />;

    return (
      <div className="app">
        <div className="app-header">
          <div className="app-brand">
            <img
              src="/Logo_reciipes_nobg.png"
              alt="Reciipes"
              className="app-logo"
            />
            <h1>Reciipes</h1>
          </div>
          <UserProfile user={user} onLogout={handleLogout} />
        </div>
        <NavBar />

        <SearchAndFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          filters={filters}
          onFilterChange={setFilters}
          onAddRecipe={handleAddRecipe}
          recipeCount={filteredRecipes.length}
        />

        {filteredRecipes.length > 0 ? (
          <div className="recipe-grid">
            {filteredRecipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                onClick={handleRecipeClick}
              />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h3>Aucune recette trouvée</h3>
            {searchTerm || filters.type !== "all" ? (
              <p>
                Essayez d'élargir votre recherche ou réinitialisez les filtres.
              </p>
            ) : (
              <p>Ajoutez votre première recette en cliquant sur «+ Ajouter».</p>
            )}
          </div>
        )}

        {selectedRecipe && (
          <RecipeDetail
            recipe={selectedRecipe}
            onClose={handleCloseDetail}
            onEdit={handleEditRecipe}
            onDelete={handleDeleteRecipe}
          />
        )}

        {showForm && (
          <RecipeForm
            recipe={editingRecipe}
            onSave={handleSaveRecipe}
            onCancel={handleCancelForm}
          />
        )}

        {notifications.map((n) => (
          <div key={n.id} className={`notification ${n.type}`}>
            {n.message}
          </div>
        ))}
      </div>
    );
  }

  if (!authChecked) {
    return (
      <div className="app">
        <div className="loading">
          <h2>Vérification de l'authentification...</h2>
          <p>Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Home />;
  }

  if (loading) {
    return (
      <div className="app">
        <div className="loading">
          <h2>Chargement des recettes...</h2>
          <p>Merci de patienter</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app">
        <div className="empty-state">
          <h2>Erreur de connexion</h2>
          <p>{error}</p>
          <p>Assurez-vous que le serveur backend est démarré avec :</p>
          <code
            style={{
              background: "#f5deb3",
              padding: "0.5rem",
              borderRadius: "5px",
            }}
          >
            npm run server
          </code>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="app-header">
        <div className="app-brand">
          <img
            src="/Logo_reciipes_nobg.png"
            alt="Reciipes"
            className="app-logo"
          />
          <h1>Reciipes</h1>
        </div>
        <UserProfile user={user} onLogout={handleLogout} />
      </div>
      <NavBar />

      <SearchAndFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filters={filters}
        onFilterChange={setFilters}
        onAddRecipe={handleAddRecipe}
        recipeCount={filteredRecipes.length}
      />

      {filteredRecipes.length > 0 ? (
        <div className="recipe-grid">
          {filteredRecipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onClick={handleRecipeClick}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h3>Aucune recette trouvée</h3>
          {searchTerm ||
          filters.type !== "all" ||
          filters.category !== "all" ||
          filters.maxTime !== "all" ? (
            <p>Essayez de modifier vos critères de recherche ou vos filtres.</p>
          ) : (
            <p>Commencez par ajouter votre première recette !</p>
          )}
        </div>
      )}

      {selectedRecipe && (
        <RecipeDetail
          recipe={selectedRecipe}
          onClose={handleCloseDetail}
          onEdit={handleEditRecipe}
          onDelete={handleDeleteRecipe}
        />
      )}

      {showForm && (
        <RecipeForm
          recipe={editingRecipe}
          onSave={handleSaveRecipe}
          onCancel={handleCancelForm}
          showNotification={showNotification}
        />
      )}

      <div className="notifications-container">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`notification notification-${notification.type}`}
            onClick={() => removeNotification(notification.id)}
          >
            <div className="notification-content">
              <span className="notification-icon">
                {notification.type === "success" ? "OK" : "X"}
              </span>
              <span className="notification-message">
                {notification.message}
              </span>
            </div>
            <button
              className="notification-close"
              onClick={(e) => {
                e.stopPropagation();
                removeNotification(notification.id);
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
