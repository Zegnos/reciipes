export const getApiBaseUrl = () => {
  if (import.meta.env.PROD) {
    return `${window.location.origin}/api`;
  }

  const devBase = import.meta.env.VITE_DEV_URL || import.meta.env.VITE_API_URL;
  if (devBase)
    return devBase.endsWith("/api")
      ? devBase
      : `${devBase.replace(/\/+$/, "")}/api`;

  return "http://localhost:2029/api";
};

export function getAuthUrl() {
  if (import.meta.env.PROD) return `${window.location.origin}/auth/google`;
  const devBase = import.meta.env.VITE_DEV_URL || import.meta.env.VITE_API_URL;
  const base = devBase
    ? devBase.endsWith("/api")
      ? devBase.replace(/\/api\/?$/, "")
      : devBase.replace(/\/+$/, "")
    : "http://localhost:2029";
  return `${base}/auth/google`;
}

const API_BASE_URL = getApiBaseUrl();

const apiCall = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    ...options,
  };

  try {
    const response = await fetch(url, config);

    if (
      response.type === "opaque" ||
      response.type === "opaqueredirect" ||
      response.status === 0
    ) {
      const err = new Error(
        "Requête bloquée ou réponse opaque (vérifiez CORS et redirections)."
      );
      err.type = response.type;
      err.status = response.status;
      throw err;
    }

    if (!response.ok) {
      let errorMessage = `API Error: ${response.status} ${response.statusText}`;
      let errorDetails = null;
      try {
        const errorData = await response.json();
        if (errorData.error) errorMessage = errorData.error;
        if (errorData.details) errorDetails = errorData.details;
      } catch (e) {}
      const error = new Error(errorMessage);
      error.status = response.status;
      error.details = errorDetails;
      throw error;
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
};

// CRUD Operations avec API
export const recipeService = {
  getAllRecipes: async () => await apiCall("/recipes"),

  getRecipeById: async (id) => await apiCall(`/recipes/${id}`),

  addRecipe: async (newRecipe) =>
    await apiCall("/recipes", {
      method: "POST",
      body: JSON.stringify(newRecipe),
    }),

  updateRecipe: async (id, updatedRecipe) =>
    await apiCall(`/recipes/${id}`, {
      method: "PUT",
      body: JSON.stringify(updatedRecipe),
    }),

  deleteRecipe: async (id) =>
    await apiCall(`/recipes/${id}`, { method: "DELETE" }),

  searchRecipesByName: (recipes, searchTerm) => {
    if (!searchTerm) return recipes;
    const term = searchTerm.toLowerCase();
    return recipes.filter((recipe) => {
      const nameMatch = recipe.name && recipe.name.toLowerCase().includes(term);
      const tagsMatch = Array.isArray(recipe.tags)
        ? recipe.tags.some((t) => t && t.toLowerCase().includes(term))
        : false;
      return nameMatch || tagsMatch;
    });
  },

  filterRecipes: (recipes, filters) => {
    let filteredRecipes = [...recipes];
    if (filters.type && filters.type !== "all") {
      filteredRecipes = filteredRecipes.filter(
        (recipe) => recipe.type === filters.type
      );
    }
    if (filters.category && filters.category !== "all") {
      filteredRecipes = filteredRecipes.filter(
        (recipe) => recipe.category === filters.category
      );
    }
    if (filters.maxTime) {
      const timeCategories = { express: 15, rapide: 30, moyen: 60, long: 999 };
      const maxMinutes = timeCategories[filters.maxTime] || 999;
      filteredRecipes = filteredRecipes.filter(
        (recipe) => recipe.totalTime <= maxMinutes
      );
    }
    return filteredRecipes;
  },

  calculateProportions: (recipe, newServings) => {
    const ratio = newServings / recipe.servings;
    return {
      ...recipe,
      servings: newServings,
      ingredients: recipe.ingredients.map((ingredient) => ({
        ...ingredient,
        quantity: Math.round(ingredient.quantity * ratio * 100) / 100,
      })),
    };
  },

  testConnection: async () => await apiCall("/test"),

  exportToJSON: async () => {
    const recipes = await recipeService.getAllRecipes();
    const dataStr = JSON.stringify(recipes, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "mes-recettes.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  getStats: (recipes) => ({
    total: recipes.length,
    categories: recipes.reduce((acc, recipe) => {
      acc[recipe.category] = (acc[recipe.category] || 0) + 1;
      return acc;
    }, {}),
    avgRating:
      recipes.length > 0
        ? Math.round(
            (recipes.reduce((sum, recipe) => sum + recipe.rating, 0) /
              recipes.length) *
              10
          ) / 10
        : 0,
  }),

  uploadImage: async (imageFile) => {
    const formData = new FormData();
    formData.append("image", imageFile);
    const url = `${API_BASE_URL}/upload-image`;
    const response = await fetch(url, {
      method: "POST",
      credentials: "include",
      body: formData,
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Erreur lors de l'upload de l'image");
    }
    return await response.json();
  },

  uploadImageAdvanced: async (imageFile) => {
    const formData = new FormData();
    formData.append("image", imageFile);
    const url = `${API_BASE_URL}/upload-image-advanced`;
    const response = await fetch(url, {
      method: "POST",
      credentials: "include",
      body: formData,
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Erreur lors de l'upload de l'image");
    }
    return await response.json();
  },

  getImageInfo: async (filename) => await apiCall(`/image-info/${filename}`),

  cleanupOldImages: async (hours = 24) =>
    await apiCall(`/cleanup-images?hours=${hours}`),

  uploadNoteImage: async (recipeId, imageFile) => {
    const formData = new FormData();
    formData.append("image", imageFile);
    const url = `${API_BASE_URL}/recipes/${recipeId}/note-images`;
    const response = await fetch(url, {
      method: "POST",
      credentials: "include",
      body: formData,
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Erreur lors de l'upload de l'image");
    }
    return await response.json();
  },

  getNoteImages: async (recipeId) => {
    const url = `${API_BASE_URL}/recipes/${recipeId}/note-images`;
    const response = await fetch(url, {
      method: "GET",
      credentials: "include",
    });
    if (!response.ok)
      throw new Error("Erreur lors de la récupération des images");
    return await response.json();
  },

  deleteNoteImage: async (recipeId, imageId) => {
    const url = `${API_BASE_URL}/recipes/${recipeId}/note-images/${imageId}`;
    const response = await fetch(url, {
      method: "DELETE",
      credentials: "include",
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Erreur lors de la suppression");
    }
    return await response.json();
  },
};

// Export des constantes pour les filtres
export const RECIPE_FILTERS = {
  types: [
    { value: "all", label: "Tous types" },
    { value: "sucré", label: "Sucré" },
    { value: "salé", label: "Salé" },
  ],
  categories: [
    { value: "all", label: "Toutes catégories" },
    { value: "entrée", label: "Entrée" },
    { value: "plat", label: "Plat principal" },
    { value: "dessert", label: "Dessert" },
    { value: "apéritif", label: "Apéritif" },
    { value: "boisson", label: "Boisson" },
  ],
  times: [
    { value: "all", label: "Tous temps" },
    { value: "express", label: "Express (≤ 15min)" },
    { value: "rapide", label: "Rapide (≤ 30min)" },
    { value: "moyen", label: "Moyen (30-60min)" },
    { value: "long", label: "Long (+ 60min)" },
  ],
};

const MAX_RATING = 5;
const clampRating = (value) => Math.min(Math.max(value, 0), MAX_RATING);

export const parseRating = (rawRating) => {
  if (rawRating === undefined || rawRating === null || rawRating === "") {
    return { value: 0, votes: null, isFallback: true };
  }

  if (typeof rawRating === "string" && rawRating.includes("/")) {
    const [scorePart, votesPart] = rawRating.split("/");
    const parsedScore = parseFloat(scorePart.trim());
    const parsedVotes = parseInt(votesPart.trim(), 10);

    return {
      value: Number.isNaN(parsedScore) ? 0 : clampRating(parsedScore),
      votes: Number.isNaN(parsedVotes) ? null : parsedVotes,
      isFallback: Number.isNaN(parsedScore),
    };
  }

  const numericScore =
    typeof rawRating === "number" ? rawRating : parseFloat(rawRating);

  return {
    value: Number.isNaN(numericScore) ? 0 : clampRating(numericScore),
    votes: null,
    isFallback: Number.isNaN(numericScore),
  };
};

export const buildRatingStars = (value = 0) => {
  const safeValue = Number.isFinite(value) ? clampRating(value) : 0;
  const filled = Math.round(safeValue);
  const empty = MAX_RATING - filled;
  return `${"★".repeat(filled)}${"☆".repeat(Math.max(empty, 0))}`;
};
