import React from "react";
import { RECIPE_FILTERS } from "../services/recipeService";

const SearchAndFilters = ({
  searchTerm,
  onSearchChange,
  filters,
  onFilterChange,
  onAddRecipe,
  recipeCount,
}) => {
  const handleFilterChange = (filterType, value) => {
    onFilterChange({
      ...filters,
      [filterType]: value,
    });
  };

  return (
    <div className="search-filters-container">
      {/* Header avec boutons */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "2rem",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <h2 style={{ color: "#f2f2f2", margin: 0 }}>
          Mes Recettes — {recipeCount || 0} recette
          {(recipeCount || 0) > 1 ? "s" : ""}
        </h2>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <button className="btn btn-new-recipe" onClick={onAddRecipe}>
            Nouvelle recette
          </button>
        </div>
      </div>

      {/* Barre de recherche */}
      <input
        type="text"
        placeholder="Rechercher une recette par nom ou tag..."
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        className="search-bar"
      />

      {/* Filtres */}
      <div className="filters-row">
        <div className="filter-group">
          <label className="filter-label">Type</label>
          <select
            value={filters.type || "all"}
            onChange={(e) => handleFilterChange("type", e.target.value)}
            className="filter-select"
          >
            {RECIPE_FILTERS.types.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label">Catégorie</label>
          <select
            value={filters.category || "all"}
            onChange={(e) => handleFilterChange("category", e.target.value)}
            className="filter-select"
          >
            {RECIPE_FILTERS.categories.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label">Temps de préparation</label>
          <select
            value={filters.maxTime || "all"}
            onChange={(e) => handleFilterChange("maxTime", e.target.value)}
            className="filter-select"
          >
            {RECIPE_FILTERS.times.map((time) => (
              <option key={time.value} value={time.value}>
                {time.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Indicateur de filtres actifs */}
      {(filters.type !== "all" ||
        filters.category !== "all" ||
        filters.maxTime !== "all") && (
        <div style={{ marginTop: "1rem", textAlign: "center" }}>
          <button
            onClick={() => {
              onFilterChange({
                type: "all",
                category: "all",
                maxTime: "all",
              });

              if (typeof onSearchChange === "function") onSearchChange("");
            }}
            className="btn btn-secondary"
            style={{ fontSize: "0.9rem" }}
          >
            Réinitialiser les filtres
          </button>
        </div>
      )}
    </div>
  );
};

export default SearchAndFilters;
